import { useEffect, useRef } from 'react';
import { useAuthStore } from '../../contexts/AuthContext';

interface Message {
  _id: string;
  senderId: any;
  content: string;
  createdAt: string;
  status: string;
}

interface MessageListProps {
  messages: Message[];
}

export const MessageList = ({ messages }: MessageListProps) => {
  const { user } = useAuthStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-dark-400">No messages yet. Start the conversation!</p>
        </div>
      ) : (
        messages.map((message, index) => {
          const isOwn = message.senderId._id === user?._id;
          const showAvatar = index === 0 || messages[index - 1].senderId._id !== message.senderId._id;
          const sender = message.senderId;

          return (
            <div
              key={message._id}
              className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {!isOwn && (
                <div className="flex-shrink-0">
                  {showAvatar ? (
                    <div className="avatar w-8 h-8">
                      {sender.avatar ? (
                        <img
                          src={sender.avatar}
                          alt={sender.displayName}
                          className="w-full h-full rounded-full"
                        />
                      ) : (
                        <span className="text-xs">{getInitials(sender.displayName)}</span>
                      )}
                    </div>
                  ) : (
                    <div className="w-8" />
                  )}
                </div>
              )}

              <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                {!isOwn && showAvatar && (
                  <span className="text-xs text-dark-400 mb-1 px-4">
                    {sender.displayName}
                  </span>
                )}
                <div
                  className={`${
                    isOwn ? 'message-bubble-sent' : 'message-bubble-received'
                  } shadow-lg`}
                >
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                </div>
                <span className="text-xs text-dark-500 mt-1 px-4">
                  {formatTime(message.createdAt)}
                  {isOwn && message.status && (
                    <span className="ml-1">
                      {message.status === 'sent' && '✓'}
                      {message.status === 'delivered' && '✓✓'}
                      {message.status === 'read' && <span className="text-primary-400">✓✓</span>}
                    </span>
                  )}
                </span>
              </div>

              {isOwn && <div className="w-8" />}
            </div>
          );
        })
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};
