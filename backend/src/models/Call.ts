import mongoose, { Schema, Document } from 'mongoose';

export interface ICall extends Document {
  callerId: mongoose.Types.ObjectId;
  calleeId: mongoose.Types.ObjectId;
  type: 'audio' | 'video';
  status: 'initiated' | 'ringing' | 'accepted' | 'rejected' | 'ended' | 'failed';
  roomId: string;
  startedAt?: Date;
  endedAt?: Date;
  duration?: number;
  createdAt: Date;
  updatedAt: Date;
}

const CallSchema: Schema = new Schema(
  {
    callerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    calleeId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ['audio', 'video'],
      required: true
    },
    status: {
      type: String,
      enum: ['initiated', 'ringing', 'accepted', 'rejected', 'ended', 'failed'],
      default: 'initiated'
    },
    roomId: {
      type: String,
      required: true,
      unique: true
    },
    startedAt: {
      type: Date
    },
    endedAt: {
      type: Date
    },
    duration: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Indexes for efficient queries
CallSchema.index({ callerId: 1, createdAt: -1 });
CallSchema.index({ calleeId: 1, createdAt: -1 });
CallSchema.index({ roomId: 1 });

export default mongoose.model<ICall>('Call', CallSchema);
