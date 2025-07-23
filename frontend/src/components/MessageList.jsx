// src/components/MessageList.jsx

import React, { useRef, useEffect } from 'react';
import Message from './Message';
import { Sparkles } from 'lucide-react';
import { Bot } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const MessageList = ({ messages, isLoading, isEmpty }) => {
  const chatEndRef = useRef(null);
  const { isAuthenticated, user } = useAuth();

  // Scroll to bottom when new messages are added
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (isEmpty) {
    return (
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2">
        <div className="max-w-3xl mx-auto flex flex-col items-center justify-center h-full text-center">
            <h2 className="text-4xl font-bold text-gray-300 mb-2">
              Welcome{isAuthenticated && user?.name ? `, ${user.name}` : ''}!
            </h2>
            <p className="text-lg text-gray-500 mb-8">Learn new concepts or deepen your understanding of existing knowledge</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-2">
      <div className="max-w-3xl mx-auto">
        {messages.map((message, index) => (
          <Message key={message.id} message={message} index={index} />
        ))}
        
        {isLoading && (
          <div className="flex mb-4">
            <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center mr-3">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}
        
        <div ref={chatEndRef} />
      </div>
    </div>
  );
};

export default MessageList;