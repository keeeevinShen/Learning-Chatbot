// src/components/ChatbotInterface.jsx

import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { sendMessage, fetchChats } from '../service/chatService';

const ChatbotInterface = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Initialize chats
  useEffect(() => {
    const loadChats = async () => {
      const initialChats = await fetchChats();
      setChats(initialChats);
    };
    loadChats();
  }, []);

  const createNewChat = () => {
    const newChat = {
      id: Date.now(),
      title: 'New Chat',
      messages: []
    };
    setChats([newChat, ...chats]);
    setActiveChat(newChat);
  };

  const handleSendMessage = async (inputValue, files = []) => {
    if (!inputValue.trim() && files.length === 0) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputValue,
      attachments: files.map(file => ({
        name: file.name,
        size: file.size,
        type: file.type
      }))
    };

    let currentChat = activeChat;
    if (!currentChat) {
      currentChat = {
        id: Date.now(),
        title: inputValue.slice(0, 30) + (inputValue.length > 30 ? '...' : '') || 'File Upload',
        messages: []
      };
      setChats([currentChat, ...chats]);
    }

    const updatedChat = {
      ...currentChat,
      messages: [...currentChat.messages, userMessage]
    };

    setActiveChat(updatedChat);
    setChats(chats.map(chat => chat.id === updatedChat.id ? updatedChat : chat));
    setIsLoading(true);

    // Send message to backend
    const response = await sendMessage(inputValue, currentChat.id, files);
    
    const botMessage = {
      id: Date.now() + 1,
      type: 'bot',
      content: response.message || response.error
    };

    const chatWithBotResponse = {
      ...updatedChat,
      messages: [...updatedChat.messages, botMessage]
    };

    setActiveChat(chatWithBotResponse);
    setChats(prevChats => prevChats.map(chat => 
      chat.id === chatWithBotResponse.id ? chatWithBotResponse : chat
    ));
    setIsLoading(false);
  };

  const handleChatSelect = (chat) => {
    setActiveChat(chat);
  };

  const handleDeleteChat = (chatId) => {
    setChats(chats.filter(chat => chat.id !== chatId));
    if (activeChat && activeChat.id === chatId) {
      setActiveChat(null);
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100">
      <Sidebar
        isOpen={isSidebarOpen}
        chats={chats}
        activeChat={activeChat}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onChatSelect={handleChatSelect}
        onNewChat={createNewChat}
        onDeleteChat={handleDeleteChat}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      <div className="flex-1 flex flex-col">
        <ChatHeader
          title={activeChat ? activeChat.title : 'New Chat'}
        />

        <MessageList
          messages={activeChat?.messages || []}
          isLoading={isLoading}
          isEmpty={!activeChat || activeChat.messages.length === 0}
        />

        <MessageInput
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default ChatbotInterface;