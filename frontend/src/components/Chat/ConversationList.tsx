import { useEffect } from 'react';
import { useChatStore } from '../../contexts/ChatContext';
import { useAuthStore } from '../../contexts/AuthContext';

interface ConversationListProps {
  onSelectConversation: (id: string) => void;
  selectedId?: string;
}

export const ConversationList = ({ onSelectConversation, selectedId }: ConversationListProps) => {
  const { conversations, loadConversations } = useChatStore();
  const { user } = useAuthStore();

  useEffect(() => {
    loadConversations();
  }, []);

  const getConversationName = (conversation: any) => {
    if (conversation.type === 'group') {
      return conversation.name || 'Group Chat';
    }

    const otherParticipant = conversation.participants.find(
      (p: any) => p._id !== user?._id
    );
    return otherParticipant?.displayName || otherParticipant?.username || 'Unknown';
  };

  const getConversationAvatar = (conversation: any) => {
    if (conversation.avatar) return conversation.avatar;

    if (conversation.type === 'group') {
      return null;
    }

    const otherParticipant = conversation.participants.find(
      (p: any) => p._id !== user?._id
    );
    return otherParticipant?.avatar;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();

    if (diff < 86400000) { // Less than 24 hours
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (diff < 604800000) { // Less than 7 days
      return d.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-dark-700">
        <h2 className="text-xl font-bold">Messages</h2>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {conversations.length === 0 ? (
          <div className="flex items-center justify-center h-full text-dark-400">
            <p>No conversations yet</p>
          </div>
        ) : (
          <div className="divide-y divide-dark-700">
            {conversations.map((conversation) => {
              const name = getConversationName(conversation);
              const avatar = getConversationAvatar(conversation);
              const isSelected = conversation._id === selectedId;
              const unreadCount = conversation.unreadCount?.[user?._id || ''] || 0;

              return (
                <button
                  key={conversation._id}
                  onClick={() => onSelectConversation(conversation._id)}
                  className={`w-full p-4 flex items-center gap-3 hover:bg-dark-700 transition-colors ${
                    isSelected ? 'bg-dark-700' : ''
                  }`}
                >
                  <div className="relative">
                    <div className="avatar w-12 h-12">
                      {avatar ? (
                        <img src={avatar} alt={name} className="w-full h-full rounded-full" />
                      ) : (
                        <span>{getInitials(name)}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium truncate">{name}</h3>
                      {conversation.lastMessage && (
                        <span className="text-xs text-dark-400">
                          {formatTime(conversation.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-dark-400 truncate">
                        {conversation.lastMessage?.content || 'No messages yet'}
                      </p>
                      {unreadCount > 0 && (
                        <span className="bg-primary-500 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-2">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
