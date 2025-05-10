/**
 * Chat API functionality for AllergyBuster
 * Handles communication with the backend chat API
 */

// DOM Elements
const chatContainer = document.getElementById('chat-container');
const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const sendButton = document.getElementById('send-button');

// Chat history
let chatHistory = [];

/**
 * Initialize the chat functionality
 */
function initChat() {
  if (chatForm) {
    chatForm.addEventListener('submit', sendMessage);
  }
  
  // Add initial welcome message
  addBotMessage("Hello! I'm your AllergyBuster assistant. How can I help you with your allergy concerns today?");
}

/**
 * Send a message to the chat API
 * @param {Event} event - The form submit event
 */
async function sendMessage(event) {
  event.preventDefault();
  
  const message = chatInput.value.trim();
  if (!message) return;
  
  // Add user message to chat
  addUserMessage(message);
  
  // Clear input
  chatInput.value = '';
  
  // Show typing indicator
  const typingIndicator = addTypingIndicator();
  
  try {
    const response = await fetch('/api/chatbot/chat/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: message })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Remove typing indicator
    if (typingIndicator) {
      typingIndicator.remove();
    }
    
    // Add bot response to chat
    if (data.status === 'success') {
      addBotMessage(data.reply);
    } else {
      throw new Error(data.message || 'Failed to get response');
    }
  } catch (error) {
    console.error('Chat API error:', error);
    
    // Remove typing indicator
    if (typingIndicator) {
      typingIndicator.remove();
    }
    
    // Add error message
    addBotMessage("I'm sorry, I'm having trouble connecting to my knowledge base right now. Please try again later.");
  }
}

/**
 * Add a user message to the chat
 * @param {string} message - The user's message
 */
function addUserMessage(message) {
  const messageElement = document.createElement('div');
  messageElement.className = 'chat-message user-message';
  messageElement.innerHTML = `
    <div class="message-content">
      <p>${escapeHTML(message)}</p>
    </div>
    <div class="message-avatar">
      <i class="fas fa-user"></i>
    </div>
  `;
  
  chatMessages.appendChild(messageElement);
  scrollToBottom();
  
  // Add to history
  chatHistory.push({ role: 'user', content: message });
}

/**
 * Add a bot message to the chat
 * @param {string} message - The bot's message
 */
function addBotMessage(message) {
  const messageElement = document.createElement('div');
  messageElement.className = 'chat-message bot-message';
  messageElement.innerHTML = `
    <div class="message-avatar">
      <i class="fas fa-robot"></i>
    </div>
    <div class="message-content">
      <p>${formatBotMessage(message)}</p>
    </div>
  `;
  
  chatMessages.appendChild(messageElement);
  scrollToBottom();
  
  // Add to history
  chatHistory.push({ role: 'assistant', content: message });
}

/**
 * Add a typing indicator to show the bot is "typing"
 * @returns {HTMLElement} The typing indicator element
 */
function addTypingIndicator() {
  const typingElement = document.createElement('div');
  typingElement.className = 'chat-message bot-message typing';
  typingElement.innerHTML = `
    <div class="message-avatar">
      <i class="fas fa-robot"></i>
    </div>
    <div class="message-content">
      <div class="typing-indicator">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  `;
  
  chatMessages.appendChild(typingElement);
  scrollToBottom();
  
  return typingElement;
}

/**
 * Format the bot's message with markdown-like syntax
 * @param {string} message - The bot's message
 * @returns {string} Formatted message
 */
function formatBotMessage(message) {
  // Replace URLs with links
  message = message.replace(
    /(https?:\/\/[^\s]+)/g, 
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  );
  
  // Replace *text* with <strong>text</strong>
  message = message.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
  
  // Replace _text_ with <em>text</em>
  message = message.replace(/_(.*?)_/g, '<em>$1</em>');
  
  // Replace newlines with <br>
  message = message.replace(/\n/g, '<br>');
  
  return message;
}

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} text - The text to escape
 * @returns {string} Escaped text
 */
function escapeHTML(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Scroll the chat container to the bottom
 */
function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Initialize the chat when the DOM is loaded
document.addEventListener('DOMContentLoaded', initChat);
