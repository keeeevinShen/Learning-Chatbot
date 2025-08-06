// src/components/Sidebar.jsx

import React from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Book, MessageSquare, User, X, Menu, UploadCloud, LogIn, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({
  isOpen,
  chats,
  activeChat,
  searchQuery,
  isLoadingThreads,
  onSearchChange,
  onChatSelect,
  onNewChat,
  onDeleteChat,
  onToggleSidebar
}) => {
  const { isAuthenticated, user } = useAuth();
  
  const filteredChats = chats.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Menu Toggle Button - Fixed Position */}
      <button
        onClick={onToggleSidebar}
        className="fixed top-4 left-4 z-50 p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors shadow-lg"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className={`${isOpen ? 'w-64' : 'w-16'} transition-all duration-300 bg-gray-800 border-r border-gray-700 flex flex-col overflow-hidden`}>
        {/* Spacer for the fixed menu button */}
        <div className="h-12"></div>

        {/* Navigation Links */}
        <div className="px-4 py-2 space-y-1">
        </div>

        {/* Collapsible Content - All content that should hide/show together */}
        <div className={isOpen ? 'transition-opacity duration-500 opacity-100 flex flex-col flex-1' : 'opacity-0 pointer-events-none flex flex-col flex-1'}>
          <div className="px-4 pb-4 space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search chats"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>

            {/* New Chat Button */}
            <button
              onClick={onNewChat}
              className="w-full flex items-center justify-start gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>New Chat</span>
            </button>
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto px-4 py-2">
            {/* Loading indicator */}
            {isLoadingThreads && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                <span className="ml-2 text-sm text-gray-400">Loading threads...</span>
              </div>
            )}
            
            {/* Chat list */}
            {!isLoadingThreads && (
              <div className="space-y-1">
                {filteredChats.length === 0 && isAuthenticated && (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-400">No recent conversations</p>
                    <p className="text-xs text-gray-500 mt-1">Start a new chat to begin</p>
                  </div>
                )}
                
                {filteredChats.map(chat => (
                  <div key={chat.id} className="relative group">
                    <button
                      onClick={() => onChatSelect(chat)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors pr-10 ${
                        activeChat?.id === chat.id
                          ? 'bg-gray-800 text-gray-100'
                          : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800'
                      }`}
                    >
                      <div className="truncate">{chat.title}</div>
                      {chat.updated_at && (
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(chat.updated_at).toLocaleDateString()}
                        </div>
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteChat(chat.id);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-500 hover:text-gray-100 hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-700">
            {isAuthenticated ? (
              <Link 
                to="/account" 
                className="w-full flex items-center gap-3 px-3 py-2 text-gray-400 hover:text-gray-100 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <User className="w-4 h-4" />
                <span>{user?.name || 'Account'}</span>
              </Link>
            ) : (
              <Link 
                to="/login" 
                className="w-full flex items-center gap-3 px-3 py-2 text-gray-400 hover:text-gray-100 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span>Login</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;