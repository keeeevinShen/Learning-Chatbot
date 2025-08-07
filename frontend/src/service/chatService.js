// All API-related code

// src/services/chatService.js

// Additional service functions for managing chats
export const fetchChats = async () => {
  // This would fetch all chats from the backend
  // For now, return empty array (no default threads)
  return [];
};

// New function to fetch recent threads from backend
export const fetchRecentThreads = async () => {
  try {
    const response = await fetch(`${import.meta.env.VITE_SERVER_ADDRESS}/api/threads`, {
      method: 'GET',
      credentials: 'include', // Include cookies for authentication
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const threads = await response.json();
    console.log('✅ Fetched recent threads:', threads);
    
    return threads;
  } catch (error) {
    console.error("❌ Error fetching recent threads:", error);
    // Return empty array on error to prevent breaking the UI
    return [];
  }
};

// New function to fetch thread history from backend
export const fetchThreadHistory = async (threadId) => {
  try {
    console.log('🔍 Fetching thread history for:', threadId);
    
    const response = await fetch(`${import.meta.env.VITE_SERVER_ADDRESS}/thread_history/${threadId}`, {
      method: 'GET',
      credentials: 'include', // Include cookies for authentication
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Fetched thread history:', data);
    
    // Return the messages array from the response
    return data.messages || [];
  } catch (error) {
    console.error("❌ Error fetching thread history:", error);
    // Return empty array on error to prevent breaking the UI
    return [];
  }
};

export const importLecture = async (lectureUrl) => {
  try {
    console.log('🚀 Making request to backend with URL:', lectureUrl);
    
    const response = await fetch(`${import.meta.env.VITE_SERVER_ADDRESS}/transcript`, {
      method: 'POST',
      credentials: 'include', // Include cookies for authentication
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ lecture_url: lectureUrl }),
    });

    console.log('📡 Response status:', response.status);
    console.log('📡 Response ok:', response.ok);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Backend response data:', data);
    
    // Expected response format: { success: true/false, filename: "lecture_name.txt" }
    if (!data.success) {
      throw new Error(data.message || 'Import failed');
    }
    
    return data;
  } catch (error) {
    console.error("❌ Error importing lecture:", error);
    throw error;
  }
};