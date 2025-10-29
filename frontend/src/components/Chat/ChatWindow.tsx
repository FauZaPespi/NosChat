import { useEffect } from 'react';
import { useChatStore } from '../../contexts/ChatContext';
import { socketService } from '../../services/socket';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { useAuthStore } from '../../contexts/AuthContext';

export const ChatWindow = () => {
  const { currentConversation, messages, sendMessage, addMessage } = useChatStore();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!currentConversation) return;

    // Listen for new messages
    const handleNewMessage = (data: any) => {
      if (data.message.conversationId === currentConversation._id) {
        addMessage(data.message);
      }
    };

    const handleMessageSent = (data: any) => {
      if (data.message.conversationId === currentConversation._id) {
        addMessage(data.message);
      }
    };

    socketService.on('new_message', handleNewMessage);
    socketService.on('message_sent', handleMessageSent);

    return () => {
      socketService.off('new_message', handleNewMessage);
      socketService.off('message_sent', handleMessageSent);
    };
  }, [currentConversation, addMessage]);

  if (!currentConversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-dark-900">
        <div className="text-center">
          <div className="text-6xl mb-4">💬</div>
          <h2 className="text-2xl font-bold text-gradient mb-2">Welcome to NosChat</h2>
          <p className="text-dark-400">Select a conversation to start messaging</p>
        </div>
      </div>
    );
  }

  const getConversationName = () => {
    if (currentConversation.type === 'group') {
      return currentConversation.name || 'Group Chat';
    }

    const otherParticipant = currentConversation.participants.find(
      (p: any) => p._id !== user?._id
    );
    return otherParticipant?.displayName || otherParticipant?.username || 'Unknown';
  };

  const getConversationStatus = () => {
    if (currentConversation.type === 'group') {
      return `${currentConversation.participants.length} members`;
    }

    const otherParticipant = currentConversation.participants.find(
      (p: any) => p._id !== user?._id
    );
    return otherParticipant?.status || 'offline';
  };

  const handleSendMessage = (content: string) => {
    sendMessage(currentConversation._id, content);
  };

  return (
    <div className="flex-1 flex flex-col bg-dark-900">
      {/* Chat Header */}
      <div className="bg-dark-800 border-b border-dark-700 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="avatar w-10 h-10">
            <span className="text-sm">
              {getConversationName()
                .split(' ')
                .map((n: string) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)}
            </span>
          </div>
          <div>
            <h2 className="font-semibold">{getConversationName()}</h2>
            <p className="text-xs text-dark-400 capitalize">{getConversationStatus()}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="btn-ghost p-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
          </button>
          <button className="btn-ghost p-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <MessageList messages={messages} />

      {/* Input */}
      <MessageInput
        conversationId={currentConversation._id}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
};
