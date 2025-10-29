import mongoose, { Schema, Document } from 'mongoose';

export interface IConversation extends Document {
  participants: mongoose.Types.ObjectId[];
  type: 'direct' | 'group';
  name?: string;
  avatar?: string;
  lastMessage?: mongoose.Types.ObjectId;
  unreadCount: Map<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema: Schema = new Schema(
  {
    participants: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }],
    type: {
      type: String,
      enum: ['direct', 'group'],
      required: true
    },
    name: {
      type: String,
      trim: true
    },
    avatar: {
      type: String
    },
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: 'Message'
    },
    unreadCount: {
      type: Map,
      of: Number,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

// Indexes for efficient queries
ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ updatedAt: -1 });

// Ensure direct conversations have exactly 2 participants
ConversationSchema.pre('save', function(next) {
  if (this.type === 'direct' && this.participants.length !== 2) {
    next(new Error('Direct conversation must have exactly 2 participants'));
  }
  next();
});

export default mongoose.model<IConversation>('Conversation', ConversationSchema);
