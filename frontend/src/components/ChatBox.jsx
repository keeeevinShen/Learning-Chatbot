// This is example JavaScript code for your future frontend

// The user types a message and clicks a button
const userMessage = "Hello, what can you do?";
const currentConversationId = "conv_12345";

// 1. Create a simple JavaScript object that matches the backend's Pydantic model
const requestBody = {
  message: userMessage,
  conversation_id: currentConversationId,
};

// 2. Send it to the backend using the 'fetch' API
fetch('http://127.0.0.1:8000/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  // Convert the JavaScript object into a JSON string for sending
  body: JSON.stringify(requestBody), 
})
.then(response => response.json())
.then(data => {
  console.log("Response from backend:", data.response_text);
  // Here, you would display the chatbot's response on the screen
});