import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Send, Paperclip, Phone, Video, ArrowLeft, FileText, Download, X, Image as ImageIcon, Clock } from 'lucide-react';
import { messagesAPI } from '../api';
import { useAuthStore } from '../store';
import { useCall } from '../contexts/CallContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { formatTimeAgo } from '../utils';

const Messages = () => {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const { user: currentUser } = useAuthStore();
  const { userId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const { initiateCall } = useCall();
  const { onlineUsers, sendMessage, addMessageHandler, removeMessageHandler } = useWebSocket();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadConversations = useCallback(async () => {
    try {
      const response = await messagesAPI.getConversations();
      setConversations(response.data);
      return response.data;
    } catch (error) {
      console.error("Failed to load conversations", error);
      return [];
    }
  }, []);

  const updateConversationList = useCallback((newMessage, isReceived = false) => {
    setConversations(prevConvs => {
      const conversationPartnerId = isReceived ? newMessage.sender_id : newMessage.receiver_id;

      // Find the existing conversation to update
      const convIndex = prevConvs.findIndex(c => c.user.id === conversationPartnerId);
      
      const otherConvs = [...prevConvs];
      let updatedConv;

      if (convIndex !== -1) {
        // Conversation exists, pull it out to move to the top
        updatedConv = { ...otherConvs.splice(convIndex, 1)[0] };
      } else if (isReceived) {
        // New conversation from a new person messaging us
        updatedConv = { user: newMessage.sender, last_message: null, unread_count: 0 };
      } else {
        // This case should ideally not happen for sent messages, but as a fallback:
        return prevConvs;
      }
      
      updatedConv.last_message = newMessage;

      // Increment unread count only if it's a received message for a non-active chat
      if (isReceived && conversationPartnerId !== parseInt(userId)) {
        updatedConv.unread_count = (updatedConv.unread_count || 0) + 1;
      }

      return [updatedConv, ...otherConvs];
    });
  }, [userId]);





  // --- WebSocket Message Handler ---
  useEffect(() => {
    const messageHandler = (payload) => {
      const currentUserId = parseInt(userId); // Get the latest userId

      if (payload.type === 'new_message') {
        const messageData = payload.data;
        if (messageData.sender_id !== currentUser.id && (messageData.sender_id === currentUserId || messageData.receiver_id === currentUserId)) {
          setMessages((prev) => {
            // Check if message already exists
            const exists = prev.some(msg => msg.id === messageData.id);
            if (exists) return prev;
            return [...prev, messageData];
          });
        }
        updateConversationList(messageData, messageData.sender_id !== currentUser.id);

      } else if (payload.type === 'message_updated') {
        const messageData = payload.data;
        if (messageData.sender_id !== currentUser.id && (messageData.sender_id === currentUserId || messageData.receiver_id === currentUserId)) {
          setMessages((prev) => prev.map(msg => msg.id === messageData.id ? messageData : msg));
        }
        updateConversationList(messageData, messageData.sender_id !== currentUser.id);

      } else if (payload.type === 'typing_start' && payload.data?.user_id === currentUserId) {
        setIsTyping(true);
      } else if (payload.type === 'typing_stop' && payload.data?.user_id === currentUserId) {
        setIsTyping(false);
      }
    };

    addMessageHandler('messages', messageHandler);

    return () => {
      removeMessageHandler('messages');
    };
  }, [userId, currentUser.id, updateConversationList, addMessageHandler, removeMessageHandler]);


  useEffect(() => {
    const initConversations = async () => {
      const convs = await loadConversations();
      if (userId) {
        let currentConv = convs.find(c => c.user.id === parseInt(userId));
        if (!currentConv && location.state?.user) {
          currentConv = { user: location.state.user, last_message: null, unread_count: 0 };
          setConversations(prev => [currentConv, ...prev]);
        }
        setActiveConversation(currentConv);
      }
    };
    initConversations();
  }, [userId, location.state, loadConversations]);

  useEffect(() => {
    if (activeConversation) {
      const loadMessages = async () => {
        setIsLoading(true);
        try {
          const response = await messagesAPI.getConversation(activeConversation.user.id);
          setMessages(response.data);
          setConversations(prevConvs => 
            prevConvs.map(c => 
              c.user.id === activeConversation.user.id ? { ...c, unread_count: 0 } : c
            ));
        } catch (error) {
          console.error("Failed to load messages", error);
          setMessages([]);
        } finally {
          setIsLoading(false);
        }
      };
      loadMessages();
    } else {
      setMessages([]);
    }
  }, [activeConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) setFile(selectedFile);
  };

  const handleTyping = (text) => {
    setNewMessage(text);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    sendMessage({ type: 'typing_start', receiver_id: activeConversation?.user.id });

    typingTimeoutRef.current = setTimeout(() => {
      sendMessage({ type: 'typing_stop', receiver_id: activeConversation?.user.id });
    }, 2000);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !file) || !activeConversation) return;

    const formData = new FormData();
    if (newMessage.trim()) formData.append('content', newMessage);
    if (file) formData.append('file', file);
    formData.append('receiver_id', activeConversation.user.id);

    try {
      // Optimistically add a placeholder for media messages
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      if (file) {
        const placeholder = {
          id: tempId,
          content: file.name,
          sender_id: currentUser.id,
          receiver_id: activeConversation.user.id,
          created_at: new Date().toISOString(),
          message_type: 'file', // Placeholder type
          status: 'uploading',
          sender: { id: currentUser.id, full_name: currentUser.full_name },
          receiver: { id: activeConversation.user.id, full_name: activeConversation.user.full_name }
        };
        setMessages(prev => [...prev, placeholder]);
      }
      
      const response = await messagesAPI.send(formData);
      const sentMessage = response.data;
      
      // Replace placeholder with actual message if it was a file upload
      if (file) {
          setMessages(prev => prev.map(msg => msg.id === tempId ? sentMessage : msg));
      } else {
          setMessages(prev => [...prev, sentMessage]);
      }

      setNewMessage('');
      setFile(null);
      if(fileInputRef.current) fileInputRef.current.value = "";
      updateConversationList(sentMessage, false);
    } catch (error) {
      console.error("Failed to send message", error);
    }
  };

  const selectConversation = (conv) => {
    navigate(`/messages/${conv.user.id}`, { state: { user: conv.user } });
  };

  return (
    <div className="flex h-full bg-gray-100 dark:bg-gray-900">
      {/* Conversations List */}
      <div className={`w-full md:w-1/3 border-r border-gray-200 dark:border-gray-700 ${!userId ? 'flex' : 'hidden'} md:flex flex-col`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate('/feed')} className="p-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <ArrowLeft size={24} className="text-gray-600 dark:text-gray-400" />
            </motion.button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Chats</h1>
          </div>
        </div>
        <div className="flex-grow overflow-y-auto">
          {conversations.map((conv) => (
            <div key={conv.user.id} onClick={() => selectConversation(conv)} className={`p-4 flex items-center cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 ${activeConversation?.user.id === conv.user.id ? 'bg-primary-100 dark:bg-primary-900' : ''}`}>
              <div className="relative mr-4 flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold">
                    {conv.user.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                  </span>
                </div>
                {onlineUsers.has(conv.user.id) && (
                  <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-green-500 ring-2 ring-white dark:ring-gray-800"></span>
                )}
              </div>
              <div className="flex-grow overflow-hidden">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{conv.user.full_name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {conv.last_message ? (conv.last_message.message_type !== 'text' ? <span className="flex items-center"><ImageIcon size={14} className="mr-1 inline-block"/>{conv.last_message.message_type}</span> : conv.last_message.content) : 'No messages yet'}
                </p>
              </div>
              {conv.unread_count > 0 && (
                <div className="bg-primary-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center ml-2 flex-shrink-0">
                  {conv.unread_count}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Chat Window */}
      <div className={`w-full md:w-2/3 ${userId ? 'flex' : 'hidden'} md:flex flex-col`}>
        {activeConversation ? (
          <>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <div className="flex items-center">
                <button onClick={() => navigate('/messages')} className="md:hidden mr-4 text-gray-500 hover:text-primary-600">
                  <ArrowLeft size={22} />
                </button>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{activeConversation.user.full_name}</h2>
                  {isTyping && <p className="text-xs text-primary-500 animate-pulse">typing...</p>}
                </div>
              </div>
              <div className="flex space-x-4">
                <button onClick={() => activeConversation && initiateCall(activeConversation.user)} className="text-gray-500 hover:text-primary-600">
                  <Phone size={20} />
                </button>
                <button className="text-gray-500 hover:text-primary-600"><Video size={20} /></button>
              </div>
            </div>
            <div className="flex-grow p-4 overflow-y-auto bg-gray-50 dark:bg-gray-800">
              {isLoading ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={`flex my-2 ${msg.sender_id === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-md p-3 rounded-lg ${msg.sender_id === currentUser.id ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'}`}>
                      {msg.message_type === 'image' && msg.media_url && (
                        <img src={msg.media_url} alt="sent content" className="rounded-lg max-w-xs mb-2" />
                      )}
                      {msg.message_type === 'video' && msg.media_url && (
                        <video src={msg.media_url} controls className="rounded-lg max-w-xs mb-2" />
                      )}
                      {msg.message_type === 'file' && msg.media_url && (
                        <a href={msg.media_url} target="_blank" rel="noopener noreferrer" download className="flex items-center bg-gray-200 dark:bg-gray-600 p-2 rounded-lg mb-2 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200">
                          <FileText className="mr-2" />
                          <span className="truncate">{msg.content || 'Download File'}</span>
                          <Download className="ml-auto" />
                        </a>
                      )}
                      {msg.content && msg.message_type === 'text' && (
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      )}
                      <div className="flex justify-end items-center mt-1">
                        {msg.status === 'uploading' && <Clock size={12} className="opacity-70 mr-1" />}
                        <span className="text-xs opacity-70">
                          {formatTimeAgo(msg.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
              {file &&
                <div className="relative mb-2 p-2 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center max-w-md">
                    {file.type.startsWith('image/') ? (
                        <img src={URL.createObjectURL(file)} alt="preview" className="w-16 h-16 object-cover rounded-md mr-3" />
                    ) : (
                        <FileText className="w-12 h-12 text-gray-500 mr-3 flex-shrink-0" />
                    )}
                    <div className="flex-grow overflow-hidden">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{file.name}</p>
                        <p className="text-xs text-gray-500">{Math.round(file.size / 1024)} KB</p>
                    </div>
                    <button onClick={() => { setFile(null); if(fileInputRef.current) fileInputRef.current.value = ""; }} className="ml-2 p-1 text-gray-500 hover:text-red-600 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full">
                        <X size={18} />
                    </button>
                </div>}
              <form onSubmit={handleSendMessage} className="flex items-center">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                <button type="button" onClick={() => fileInputRef.current.click()} className="text-gray-500 mr-2 p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full">
                  <Paperclip size={22} />
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => handleTyping(e.target.value)}
                  placeholder="Type a message..."
                  className="input-field flex-grow"
                />
                <button type="submit" className="btn-primary ml-2 p-2">
                  <Send size={20} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-grow flex items-center justify-center text-gray-500">
            <p>Select a conversation to start chatting.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
