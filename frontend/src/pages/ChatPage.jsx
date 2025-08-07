// In frontend/src/pages/ChatPage.jsx

import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import ChatHeader from '../components/ChatHeader';
import MessageList from '../components/MessageList';
import MessageInput from '../components/MessageInput';
import { fetchChats, fetchRecentThreads, fetchThreadHistory } from '../service/chatService';
import { useAuth } from '../context/AuthContext';

const ChatPage = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const streamingBotMessageRef = useRef(null);
  const { userThreads, loading: authLoading, isAuthenticated } = useAuth(); // Get the auth loading state

  // Helper function to transform backend messages to frontend format
  const transformMessage = (message, index) => {
    // Handle different message formats from the backend
    if (typeof message === 'string') {
      // Simple string message - treat as bot message
      return {
        id: `msg-${Date.now()}-${index}`,
        type: 'bot',
        content: message,
        isStreaming: false
      };
    }
    
    // Handle LangGraph message format
    if (message.type === 'human' || message.type === 'user') {
      return {
        id: message.id || `msg-${Date.now()}-${index}`,
        type: 'user',
        content: message.content || message.text || '',
        attachments: message.attachments || []
      };
    } else if (message.type === 'ai' || message.type === 'assistant' || message.type === 'bot') {
      return {
        id: message.id || `msg-${Date.now()}-${index}`,
        type: 'bot',
        content: message.content || message.text || '',
        isStreaming: false
      };
    }
    
    // Fallback: try to detect based on content or default to bot
    return {
      id: message.id || `msg-${Date.now()}-${index}`,
      type: message.type || 'bot',
      content: message.content || message.text || message.toString(),
      isStreaming: false
    };
  };

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

  // Function to fetch recent threads from backend
  const loadRecentThreads = async () => {
    if (!isAuthenticated) {
      console.log('User not authenticated, skipping thread fetch');
      return;
    }

    setIsLoadingThreads(true);
    try {
      const threads = await fetchRecentThreads();
      
      // Convert threads from backend to chat format
      const chatsFromThreads = threads.map(thread => ({
        id: thread.thread_id,  // Use thread_id as the chat id
        title: thread.thread_name,
        messages: [],  // Messages will be loaded when chat is selected
        created_at: thread.created_at,
        updated_at: thread.updated_at
      }));
      
      setChats(chatsFromThreads);
      console.log('✅ Updated chats with recent threads:', chatsFromThreads);
    } catch (error) {
      console.error('❌ Failed to load recent threads:', error);
    } finally {
      setIsLoadingThreads(false);
    }
  };

  // Modified sidebar toggle handler
  const handleToggleSidebar = async () => {
    const willBeOpen = !isSidebarOpen;
    setIsSidebarOpen(willBeOpen);
    
    // If opening the sidebar and user is authenticated, fetch recent threads
    if (willBeOpen && isAuthenticated) {
      await loadRecentThreads();
    }
  };

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

  const handleChatSelect = async (chat) => {
    // Don't reload if it's already the active chat and it has messages
    if (activeChat && activeChat.id === chat.id && activeChat.messages && activeChat.messages.length > 0) {
      return;
    }

    setIsLoadingMessages(true);
    setActiveChat({ ...chat, messages: [] }); // Set active chat immediately with empty messages
    
    try {
      // Fetch thread history from backend
      const messages = await fetchThreadHistory(chat.id);
      console.log('📨 Raw messages from backend:', messages);
      
      // Transform messages to frontend format
      const transformedMessages = messages.map((message, index) => transformMessage(message, index));
      console.log('✨ Transformed messages:', transformedMessages);
      
      // Update the active chat with loaded messages
      const updatedChat = {
        ...chat,
        messages: transformedMessages
      };
      
      setActiveChat(updatedChat);
      
      // Also update the chat in the chats list
      setChats(prevChats =>
        prevChats.map(c => c.id === chat.id ? updatedChat : c)
      );
      
    } catch (error) {
      console.error('❌ Error loading thread history:', error);
      // On error, still set the chat as active but with empty messages
      setActiveChat({ ...chat, messages: [] });
    } finally {
      setIsLoadingMessages(false);
    }
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
        isLoadingThreads={isLoadingThreads}
        onSearchChange={setSearchQuery}
        onChatSelect={handleChatSelect}
        onNewChat={createNewChat}
        onDeleteChat={handleDeleteChat}
        onToggleSidebar={handleToggleSidebar}
      />

      <div className="flex-1 flex flex-col">
        <ChatHeader
          title={activeChat ? activeChat.title : 'New Chat'}
        />

        <MessageList
          messages={activeChat?.messages || []}
          isLoading={isLoading || isLoadingMessages} // Combine both loading states
          isEmpty={!activeChat || activeChat.messages.length === 0}
        />

        <MessageInput
          onSendMessage={handleSendMessage}
          isLoading={isLoading || authLoading} // Combine both loading states
        />
      </div>
    </div>
  );
};

export default ChatPage;