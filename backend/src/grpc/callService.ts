import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import Call from '../models/Call';
import { logger } from '../config/logger';

const PROTO_PATH = path.join(__dirname, '../../..', 'shared/proto/call.proto');

interface CallRequest {
  caller_id: string;
  callee_id: string;
  call_type: number;
  room_id: string;
}

interface AcceptCallRequest {
  call_id: string;
  user_id: string;
}

interface RejectCallRequest {
  call_id: string;
  user_id: string;
  reason: string;
}

interface EndCallRequest {
  call_id: string;
  user_id: string;
}

interface SignalingMessage {
  call_id: string;
  sender_id: string;
  receiver_id: string;
  type: number;
  payload: string;
}

export class CallService {
  private server: grpc.Server;
  private packageDefinition: any;
  private callProto: any;
  private signalingStreams: Map<string, grpc.ServerDuplexStream<any, any>> = new Map();

  constructor() {
    this.server = new grpc.Server();
    this.loadProto();
    this.setupService();
  }

  private loadProto(): void {
    this.packageDefinition = protoLoader.loadSync(PROTO_PATH, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true
    });

    this.callProto = grpc.loadPackageDefinition(this.packageDefinition).call;
  }

  private setupService(): void {
    this.server.addService(this.callProto.CallService.service, {
      InitiateCall: this.initiateCall.bind(this),
      AcceptCall: this.acceptCall.bind(this),
      RejectCall: this.rejectCall.bind(this),
      EndCall: this.endCall.bind(this),
      SignalingStream: this.signalingStream.bind(this)
    });
  }

  private async initiateCall(
    call: grpc.ServerUnaryCall<CallRequest, any>,
    callback: grpc.sendUnaryData<any>
  ): Promise<void> {
    try {
      const { caller_id, callee_id, call_type, room_id } = call.request;

      const callDoc = await Call.create({
        callerId: caller_id,
        calleeId: callee_id,
        type: call_type === 0 ? 'audio' : 'video',
        roomId: room_id || uuidv4(),
        status: 'initiated'
      });

      logger.info(`Call initiated: ${callDoc._id}`);

      callback(null, {
        success: true,
        message: 'Call initiated successfully',
        call_id: callDoc._id.toString(),
        status: 0
      });
    } catch (error) {
      logger.error('Initiate call error:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Failed to initiate call'
      });
    }
  }

  private async acceptCall(
    call: grpc.ServerUnaryCall<AcceptCallRequest, any>,
    callback: grpc.sendUnaryData<any>
  ): Promise<void> {
    try {
      const { call_id, user_id } = call.request;

      const callDoc = await Call.findById(call_id);

      if (!callDoc) {
        callback({
          code: grpc.status.NOT_FOUND,
          message: 'Call not found'
        });
        return;
      }

      if (callDoc.calleeId.toString() !== user_id) {
        callback({
          code: grpc.status.PERMISSION_DENIED,
          message: 'Not authorized to accept this call'
        });
        return;
      }

      callDoc.status = 'accepted';
      callDoc.startedAt = new Date();
      await callDoc.save();

      logger.info(`Call accepted: ${call_id}`);

      callback(null, {
        success: true,
        message: 'Call accepted',
        call_id: call_id,
        status: 2
      });
    } catch (error) {
      logger.error('Accept call error:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Failed to accept call'
      });
    }
  }

  private async rejectCall(
    call: grpc.ServerUnaryCall<RejectCallRequest, any>,
    callback: grpc.sendUnaryData<any>
  ): Promise<void> {
    try {
      const { call_id, user_id, reason } = call.request;

      const callDoc = await Call.findById(call_id);

      if (!callDoc) {
        callback({
          code: grpc.status.NOT_FOUND,
          message: 'Call not found'
        });
        return;
      }

      callDoc.status = 'rejected';
      callDoc.endedAt = new Date();
      await callDoc.save();

      logger.info(`Call rejected: ${call_id} - Reason: ${reason}`);

      callback(null, {
        success: true,
        message: 'Call rejected',
        call_id: call_id,
        status: 3
      });
    } catch (error) {
      logger.error('Reject call error:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Failed to reject call'
      });
    }
  }

  private async endCall(
    call: grpc.ServerUnaryCall<EndCallRequest, any>,
    callback: grpc.sendUnaryData<any>
  ): Promise<void> {
    try {
      const { call_id, user_id } = call.request;

      const callDoc = await Call.findById(call_id);

      if (!callDoc) {
        callback({
          code: grpc.status.NOT_FOUND,
          message: 'Call not found'
        });
        return;
      }

      callDoc.status = 'ended';
      callDoc.endedAt = new Date();

      if (callDoc.startedAt) {
        callDoc.duration = Math.floor(
          (callDoc.endedAt.getTime() - callDoc.startedAt.getTime()) / 1000
        );
      }

      await callDoc.save();

      logger.info(`Call ended: ${call_id} - Duration: ${callDoc.duration}s`);

      callback(null, {
        success: true,
        message: 'Call ended',
        call_id: call_id,
        status: 4
      });
    } catch (error) {
      logger.error('End call error:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Failed to end call'
      });
    }
  }

  private signalingStream(
    call: grpc.ServerDuplexStream<SignalingMessage, SignalingMessage>
  ): void {
    let userId: string | null = null;

    call.on('data', (message: SignalingMessage) => {
      try {
        const { call_id, sender_id, receiver_id, type, payload } = message;

        if (!userId) {
          userId = sender_id;
          this.signalingStreams.set(userId, call);
          logger.info(`Signaling stream established for user: ${userId}`);
        }

        // Forward message to receiver
        const receiverStream = this.signalingStreams.get(receiver_id);
        if (receiverStream) {
          receiverStream.write(message);
          logger.debug(`Signaling message forwarded from ${sender_id} to ${receiver_id}`);
        } else {
          logger.warn(`Receiver stream not found for user: ${receiver_id}`);
        }
      } catch (error) {
        logger.error('Signaling stream data error:', error);
      }
    });

    call.on('end', () => {
      if (userId) {
        this.signalingStreams.delete(userId);
        logger.info(`Signaling stream ended for user: ${userId}`);
      }
      call.end();
    });

    call.on('error', (error) => {
      logger.error('Signaling stream error:', error);
      if (userId) {
        this.signalingStreams.delete(userId);
      }
    });
  }

  public start(port: number): void {
    this.server.bindAsync(
      `0.0.0.0:${port}`,
      grpc.ServerCredentials.createInsecure(),
      (error, port) => {
        if (error) {
          logger.error('Failed to start gRPC server:', error);
          return;
        }
        this.server.start();
        logger.info(`gRPC server started on port ${port}`);
      }
    );
  }

  public stop(): void {
    this.server.tryShutdown((error) => {
      if (error) {
        logger.error('Error stopping gRPC server:', error);
      } else {
        logger.info('gRPC server stopped');
      }
    });
  }
}
