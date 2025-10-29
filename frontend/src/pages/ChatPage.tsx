import { useState, useEffect } from 'react';
import { useAuthStore } from '../contexts/AuthContext';
import { useChatStore } from '../contexts/ChatContext';
import { ConversationList } from '../components/Chat/ConversationList';
import { ChatWindow } from '../components/Chat/ChatWindow';
import { conversationApi } from '../services/api';

export const ChatPage = () => {
  const { user, logout } = useAuthStore();
  const { selectConversation, currentConversation, clearCurrentConversation } = useChatStore();
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSelectConversation = (id: string) => {
    selectConversation(id);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await conversationApi.searchUsers(query);
      setSearchResults(response.data.data);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCreateConversation = async (userId: string) => {
    try {
      const conversationId = await useChatStore.getState().createConversation([userId]);
      setShowNewChat(false);
      setSearchQuery('');
      setSearchResults([]);
      selectConversation(conversationId);
    } catch (error: any) {
      console.error('Failed to create conversation:', error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="h-screen flex bg-dark-900">
      {/* Sidebar */}
      <div className="w-80 bg-dark-800 border-r border-dark-700 flex flex-col">
        {/* User Header */}
        <div className="p-4 border-b border-dark-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="avatar w-10 h-10">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.displayName} className="w-full h-full rounded-full" />
                ) : (
                  <span className="text-sm">{getInitials(user?.displayName || '')}</span>
                )}
              </div>
              <div className="status-online" />
            </div>
            <div>
              <h3 className="font-semibold">{user?.displayName}</h3>
              <p className="text-xs text-dark-400">@{user?.username}</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="btn-ghost p-2"
            title="Logout"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-4">
          <button
            onClick={() => setShowNewChat(!showNewChat)}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </button>
        </div>

        {/* Search / New Chat Panel */}
        {showNewChat && (
          <div className="p-4 border-b border-dark-700">
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full mb-2"
            />
            {isSearching && (
              <div className="text-center text-dark-400 py-2">Searching...</div>
            )}
            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
                {searchResults.map((user) => (
                  <button
                    key={user._id}
                    onClick={() => handleCreateConversation(user._id)}
                    className="w-full flex items-center gap-3 p-2 hover:bg-dark-700 rounded-lg"
                  >
                    <div className="avatar w-8 h-8">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.displayName} className="w-full h-full rounded-full" />
                      ) : (
                        <span className="text-xs">{getInitials(user.displayName)}</span>
                      )}
                    </div>
                    <div className="text-left">
                      <p className="font-medium">{user.displayName}</p>
                      <p className="text-xs text-dark-400">@{user.username}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Conversations */}
        <ConversationList
          onSelectConversation={handleSelectConversation}
          selectedId={currentConversation?._id}
        />
      </div>

      {/* Chat Window */}
      <ChatWindow />
    </div>
  );
};
