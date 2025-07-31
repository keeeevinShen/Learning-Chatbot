// In frontend/src/pages/ChatPage.jsx

import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import ChatHeader from '../components/ChatHeader';
import MessageList from '../components/MessageList';
import MessageInput from '../components/MessageInput';
import { fetchChats } from '../service/chatService';
import { useAuth } from '../context/AuthContext';

const ChatPage = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const streamingBotMessageRef = useRef(null);
  const { userThreads } = useAuth();

  // Initialize chats from userThreads or fetch them
  useEffect(() => {
    const loadChats = async () => {
      if (userThreads && userThreads.length > 0) {
        // Convert threads from backend to chat format
        const chatsFromThreads = userThreads.map(thread => ({
          id: thread.thread_id,  // Use thread_id as the chat id
          title: thread.thread_name,
          messages: [],  // Messages will be loaded when chat is selected
          created_at: thread.created_at,
          updated_at: thread.updated_at
        }));
        setChats(chatsFromThreads);
      } else {
        // Fallback to fetchChats if no threads from login
        const initialChats = await fetchChats();
        setChats(initialChats);
      }
    };
    loadChats();
  }, [userThreads]);

  const createNewChat = () => {
    const newChat = {
      id: Date.now().toString(), // Convert to string to match thread_id format
      title: 'New Chat',
      messages: []
    };
    setChats([newChat, ...chats]);
    setActiveChat(newChat);
  };

  const handleSendMessage = async (inputValue, files = [], feynmanMode = false) => {
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
        id: Date.now().toString(), // Convert to string to match thread_id format
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

    // Handle streaming message
    await handleStreamingMessage(inputValue, files, currentChat, updatedChat, feynmanMode);
  };

  const handleChatSelect = (chat) => {
    setActiveChat(chat);
    // TODO: Load messages for this thread from backend if needed
    // You might want to call an API to fetch messages for this thread_id
  };

  const handleDeleteChat = (chatId) => {
    setChats(chats.filter(chat => chat.id !== chatId));
    if (activeChat && activeChat.id === chatId) {
      setActiveChat(null);
    }
  };

  const handleStreamingMessage = async (inputValue, files, currentChat, updatedChat, feynmanMode = false) => {
    // Create a streaming bot message
    const botMessageId = Date.now() + 1;
    const initialBotMessage = {
      id: botMessageId,
      type: 'bot',
      content: '',
      isStreaming: true
    };

    streamingBotMessageRef.current = botMessageId;

    const chatWithInitialBotMessage = {
      ...updatedChat,
      messages: [...updatedChat.messages, initialBotMessage]
    };

    setActiveChat(chatWithInitialBotMessage);
    setChats(prevChats => prevChats.map(chat => 
      chat.id === chatWithInitialBotMessage.id ? chatWithInitialBotMessage : chat
    ));

    try {
      // Your existing streaming logic here
      // Make sure to use currentChat.id as the thread_id when calling backend APIs
      
      // Simulate streaming for now
      setTimeout(() => {
        const finalBotMessage = {
          id: botMessageId,
          type: 'bot',
          content: 'This is a response from the bot.',
          isStreaming: false
        };

        const finalChat = {
          ...chatWithInitialBotMessage,
          messages: chatWithInitialBotMessage.messages.map(msg =>
            msg.id === botMessageId ? finalBotMessage : msg
          )
        };

        setActiveChat(finalChat);
        setChats(prevChats => prevChats.map(chat =>
          chat.id === finalChat.id ? finalChat : chat
        ));
        setIsLoading(false);
        streamingBotMessageRef.current = null;
      }, 1000);
      
    } catch (error) {
      console.error('Streaming error:', error);
      
      const errorBotMessage = {
        id: botMessageId,
        type: 'bot',
        content: 'Sorry, there was an error processing your message. Please try again.',
        isStreaming: false
      };

      const chatWithErrorMessage = {
        ...updatedChat,
        messages: [...updatedChat.messages, errorBotMessage]
      };

      setActiveChat(chatWithErrorMessage);
      setChats(prevChats => prevChats.map(chat => 
        chat.id === chatWithErrorMessage.id ? chatWithErrorMessage : chat
      ));
      setIsLoading(false);
      streamingBotMessageRef.current = null;
    }
  };

  return (
    <div className="flex h-full bg-gray-900 text-gray-100">
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

export default ChatPage;