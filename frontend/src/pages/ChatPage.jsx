// In frontend/src/pages/ChatPage.jsx

import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import ChatHeader from '../components/ChatHeader';
import MessageList from '../components/MessageList';
import MessageInput from '../components/MessageInput';
import { fetchChats } from '../service/chatService';
import { useAuth } from '../context/AuthContext';

const ChatPage = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
    // Create a placeholder for the bot's response
    const botMessageId = Date.now() + 1;
    const initialBotMessage = {
      id: botMessageId,
      type: 'bot',
      content: '',
      isStreaming: true,
    };
    streamingBotMessageRef.current = botMessageId;
  
    // Add the placeholder message to the chat
    const chatWithInitialBotMessage = {
      ...updatedChat,
      messages: [...updatedChat.messages, initialBotMessage],
    };
  
    setActiveChat(chatWithInitialBotMessage);
    setChats(prevChats =>
      prevChats.map(chat =>
        // This line is now fixed
        chat.id === chatWithInitialBotMessage.id ? chatWithInitialBotMessage : chat
      )
    );
  
    try {
      const formData = new FormData();
      formData.append('message', inputValue);
      formData.append('thread_id', currentChat.id);
  
      const response = await fetch(`${import.meta.env.VITE_SERVER_ADDRESS}/simplechat`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';
      let currentActiveChat = chatWithInitialBotMessage;
  
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
  
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
  
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
  
            // Check for the special thread update message
            if (data.startsWith('__THREAD_UPDATE__')) {
              try {
                const threadData = JSON.parse(data.substring(17));
                
                // Update the title in the active chat and the sidebar list
                currentActiveChat = { ...currentActiveChat, title: threadData.thread_name };
                setActiveChat(currentActiveChat);
                setChats(prevChats =>
                  prevChats.map(chat =>
                    chat.id === threadData.thread_id
                      ? { ...chat, title: threadData.thread_name }
                      : chat
                  )
                );
                
              } catch (error) {
                console.error('Error parsing thread update:', error);
              }
              continue; // Move to the next line
            }
  
            // Add regular message content
            accumulatedContent += data;
            
            // Update the bot's message content in real-time
            const updatedMessages = currentActiveChat.messages.map(msg =>
              msg.id === botMessageId
                ? { ...msg, content: accumulatedContent }
                : msg
            );
            
            currentActiveChat = { ...currentActiveChat, messages: updatedMessages };
            setActiveChat(currentActiveChat);
          }
        }
      }
      
      // Finalize the chat state by updating the main list
      setChats(prevChats =>
        prevChats.map(c => (c.id === currentActiveChat.id ? currentActiveChat : c))
      );
  
    } catch (error) {
      console.error('Streaming error:', error);
      // Show an error message to the user
      setActiveChat(prevChat => {
        const errorBotMessage = {
          id: botMessageId,
          type: 'bot',
          content: 'Sorry, an error occurred. Please try again.',
          isStreaming: false,
        };
        const finalMessages = prevChat.messages.map(m => m.id === botMessageId ? errorBotMessage : m);
        const finalChatState = { ...prevChat, messages: finalMessages };
        
        // Update the main chats list with the error message state
        setChats(prevChats => prevChats.map(c => c.id === finalChatState.id ? finalChatState : c));
        return finalChatState;
      });
  
    } finally {
      // Stop the loading indicator and finalize the bot message
      setIsLoading(false);
      setActiveChat(prevChat => {
          if (!prevChat) return null;
          const finalMessages = prevChat.messages.map(msg =>
            msg.id === botMessageId ? { ...msg, isStreaming: false } : msg
          );
          return { ...prevChat, messages: finalMessages };
      });
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