// src/pages/ChatPage.jsx

import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import ChatHeader from '../components/ChatHeader';
import MessageList from '../components/MessageList';
import MessageInput from '../components/MessageInput';
import { fetchChats } from '../service/chatService';

const ChatPage = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const streamingBotMessageRef = useRef(null);

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

    // Handle streaming message
    await handleStreamingMessage(inputValue, files, currentChat, updatedChat, feynmanMode);
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
      // Prepare the form data for the request
      const formData = new FormData();
      formData.append('message', inputValue);
      formData.append('conversation_id', currentChat.id.toString());
      
      files.forEach((file) => {
        formData.append('files', file);
      });

      // Choose endpoint based on mode (for now both use simplechat)
      const endpoint = feynmanMode 
        ? `${import.meta.env.VITE_SERVER_ADDRESS}/simplechat` // TODO: Change to /feynman when ready
        : `${import.meta.env.VITE_SERVER_ADDRESS}/simplechat`;
      
      // Start the stream
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6); // Remove 'data: ' prefix
            if (data.trim() && data !== '[DONE]') {
              streamedContent += data;
              
              // Update the streaming bot message
              setActiveChat(prevChat => {
                if (!prevChat) return prevChat;
                
                const updatedMessages = prevChat.messages.map(msg => {
                  if (msg.id === botMessageId && msg.isStreaming) {
                    return {
                      ...msg,
                      content: streamedContent,
                      isStreaming: true
                    };
                  }
                  return msg;
                });

                return {
                  ...prevChat,
                  messages: updatedMessages
                };
              });

              // Update chats array as well
              setChats(prevChats => prevChats.map(chat => {
                if (chat.id === currentChat.id) {
                  const updatedMessages = chat.messages.map(msg => {
                    if (msg.id === botMessageId && msg.isStreaming) {
                      return {
                        ...msg,
                        content: streamedContent,
                        isStreaming: true
                      };
                    }
                    return msg;
                  });
                  return { ...chat, messages: updatedMessages };
                }
                return chat;
              }));
            }
          }
        }
      }

      // Mark streaming as complete
      setActiveChat(prevChat => {
        if (!prevChat) return prevChat;
        
        const updatedMessages = prevChat.messages.map(msg => {
          if (msg.id === botMessageId) {
            return {
              ...msg,
              content: streamedContent,
              isStreaming: false
            };
          }
          return msg;
        });

        return {
          ...prevChat,
          messages: updatedMessages
        };
      });

      setChats(prevChats => prevChats.map(chat => {
        if (chat.id === currentChat.id) {
          const updatedMessages = chat.messages.map(msg => {
            if (msg.id === botMessageId) {
              return {
                ...msg,
                content: streamedContent,
                isStreaming: false
              };
            }
            return msg;
          });
          return { ...chat, messages: updatedMessages };
        }
        return chat;
      }));

      setIsLoading(false);
      streamingBotMessageRef.current = null;

    } catch (error) {
      console.error('Streaming error:', error);
      
      // Handle error by updating the bot message
      const errorBotMessage = {
        id: botMessageId,
        type: 'bot',
        content: 'Sorry, there was an error processing your request.',
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