// All API-related code

// src/services/chatService.js

export const sendMessage = async (message, conversationId, files = []) => {
    try {
      let response;
      
      if (files && files.length > 0) {
        // Use FormData for file uploads
        const formData = new FormData();
        formData.append('message', message);
        formData.append('conversation_id', conversationId);
        
        // Append each file
        files.forEach((file, index) => {
          formData.append(`files`, file);
        });
        
        response = await fetch('http://127.0.0.1:8000/chat', {
          method: 'POST',
          body: formData, // Don't set Content-Type header, let browser set it with boundary
        });
      } else {
        // Use JSON for text-only messages
        const requestBody = {
          message: message,
          conversation_id: conversationId,
        };
        
        response = await fetch('http://127.0.0.1:8000/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });
      }
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error sending message:", error);
      return { 
        error: "Failed to get a response from the server.",
        // For demo purposes, return a simulated response
        message: `I understand you're asking about "${message}"${files.length > 0 ? ` with ${files.length} file(s) attached` : ''}. Here's a helpful response with some example code:\n\n\`\`\`javascript\n// Example code snippet\nconst example = () => {\n  console.log('Hello from the chatbot!');\n  return 'This is a sample response';\n};\n\nexample();\n\`\`\`\n\nThis is a simulated response to demonstrate the chat interface${files.length > 0 ? ' with file upload capability' : ''}. In a real implementation, this would connect to your backend API and process the uploaded files.`
      };
    }
  };
  
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
  
  export const createChat = async (title) => {
    // This would create a new chat on the backend
    return {
      id: Date.now(),
      title: title,
      messages: []
    };
  };
  
  export const deleteChat = async (chatId) => {
    // This would delete a chat from the backend
    return { success: true };
  };