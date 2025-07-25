// All API-related code

// src/services/chatService.js

// Additional service functions for managing chats
export const fetchChats = async () => {
  // This would fetch all chats from the backend
  // For now, return mock data
  return [
    { id: 1, title: 'How to use React hooks', messages: [] },
    { id: 2, title: 'Explain quantum computing', messages: [] },
    { id: 3, title: 'Best practices for API design', messages: [] }
  ];
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