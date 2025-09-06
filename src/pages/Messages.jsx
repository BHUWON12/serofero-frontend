import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, Phone, Video, ArrowLeft, FileText, Download, X, Image as ImageIcon, Clock, Smile, MoreVertical, Search, Users, Settings, Archive, Pin } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const { user: currentUser } = useAuthStore();
  const { userId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);
  const { initiateCall } = useCall();
  const { onlineUsers, sendMessage, addMessageHandler, removeMessageHandler } = useWebSocket();

  // Emoji list (simplified for demo)
  const emojis = ['😊', '😂', '❤️', '👍', '😍', '🔥', '🎉', '👏', '😢', '😮', '😡', '🤔', '🙌', '💯', '✨', '🚀'];

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
      const convIndex = prevConvs.findIndex(c => c.user.id === conversationPartnerId);
      
      const otherConvs = [...prevConvs];
      let updatedConv;

      if (convIndex !== -1) {
        updatedConv = { ...otherConvs.splice(convIndex, 1)[0] };
      } else if (isReceived) {
        updatedConv = { user: newMessage.sender, last_message: null, unread_count: 0 };
      } else {
        return prevConvs;
      }
      
      updatedConv.last_message = newMessage;

      if (isReceived && conversationPartnerId !== parseInt(userId)) {
        updatedConv.unread_count = (updatedConv.unread_count || 0) + 1;
      }

      return [updatedConv, ...otherConvs];
    });
  }, [userId]);

  // WebSocket Message Handler
  useEffect(() => {
    const messageHandler = (payload) => {
      const currentUserId = parseInt(userId);

      if (payload.type === 'new_message') {
        const messageData = payload.data;
        if (messageData.sender_id !== currentUser.id && (messageData.sender_id === currentUserId || messageData.receiver_id === currentUserId)) {
          setMessages((prev) => {
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
    return () => removeMessageHandler('messages');
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

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) setFile(droppedFile);
  };

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

  const insertEmoji = (emoji) => {
    const input = inputRef.current;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const newValue = newMessage.substring(0, start) + emoji + newMessage.substring(end);
    setNewMessage(newValue);
    setShowEmojiPicker(false);
    
    // Reset cursor position
    setTimeout(() => {
      input.selectionStart = input.selectionEnd = start + emoji.length;
      input.focus();
    }, 0);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !file) || !activeConversation) return;
    
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const content = newMessage;
    const attachedFile = file;

    // Optimistic UI: create a placeholder and add it to state immediately
    const placeholder = {
      id: tempId,
      content: content || (attachedFile ? attachedFile.name : ''),
      sender_id: currentUser.id,
      receiver_id: activeConversation.user.id,
      created_at: new Date().toISOString(),
      message_type: attachedFile ? (attachedFile.type.startsWith('image/') ? 'image' : 'file') : 'text',
      status: 'sending',
      sender: { id: currentUser.id, full_name: currentUser.full_name },
      receiver: { id: activeConversation.user.id, full_name: activeConversation.user.full_name },
      media_url: attachedFile ? URL.createObjectURL(attachedFile) : null,
    };

    setMessages(prev => [...prev, placeholder]);
    updateConversationList(placeholder, false);
    
    // Clear form for immediate feedback
    setNewMessage('');
    setFile(null);
    if(fileInputRef.current) fileInputRef.current.value = "";
    
    const formData = new FormData();
    if (content.trim()) formData.append('content', content);
    if (attachedFile) formData.append('file', attachedFile);
    formData.append('receiver_id', activeConversation.user.id);

    try {
      const response = await messagesAPI.send(formData);
      const sentMessage = response.data;
      
      // Replace placeholder with the real message from server
      setMessages(prev => prev.map(msg => msg.id === tempId ? sentMessage : msg));
      updateConversationList(sentMessage, false);
    } catch (error) {
      console.error("Failed to send message", error);
      // Mark the message as failed on error
      setMessages(prev => prev.map(msg => msg.id === tempId ? { ...msg, status: 'failed' } : msg));
    }
  };

  const selectConversation = (conv) => {
    navigate(`/messages/${conv.user.id}`, { state: { user: conv.user } });
  };

  const filteredConversations = conversations.filter(conv =>
    conv.user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Enhanced Conversations List */}
      <div className={`w-full md:w-1/3 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 ${!userId ? 'flex' : 'hidden'} md:flex flex-col shadow-lg`}>
        {/* Header with enhanced styling */}
        <div className="p-4 bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <motion.button 
                whileTap={{ scale: 0.95 }} 
                whileHover={{ scale: 1.05, rotate: -5 }}
                onClick={() => navigate('/feed')} 
                className="p-2.5 rounded-xl hover:bg-white dark:hover:bg-gray-700 transition-all duration-300 shadow-sm hover:shadow-md"
              >
                <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
              </motion.button>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Messages
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {conversations.length} conversations
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 rounded-xl hover:bg-white dark:hover:bg-gray-700 transition-all duration-300 text-gray-600 dark:text-gray-400"
              >
                <Users size={18} />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 rounded-xl hover:bg-white dark:hover:bg-gray-700 transition-all duration-300 text-gray-600 dark:text-gray-400"
              >
                <Settings size={18} />
              </motion.button>
            </div>
          </div>
          
          {/* Enhanced Search Bar */}
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-300 shadow-sm hover:shadow-md"
            />
          </div>
        </div>

        {/* Enhanced Conversations */}
        <div className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
          <AnimatePresence>
            {filteredConversations.length === 0 && searchQuery ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-8 text-center"
              >
                <div className="text-gray-400 mb-2">
                  <Search size={32} className="mx-auto" />
                </div>
                <p className="text-gray-500 dark:text-gray-400">No conversations found</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Try a different search term</p>
              </motion.div>
            ) : (
              filteredConversations.map((conv, index) => (
                <motion.div
                  key={conv.user.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  whileHover={{ x: 4 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  onClick={() => selectConversation(conv)}
                  className={`p-4 flex items-center cursor-pointer transition-all duration-300 hover:bg-gray-50 dark:hover:bg-gray-750 border-l-4 relative group ${
                    activeConversation?.user.id === conv.user.id 
                      ? 'bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/30 dark:to-primary-800/20 border-primary-500 shadow-sm' 
                      : 'border-transparent hover:border-primary-200 dark:hover:border-primary-700'
                  }`}
                >
                  <div className="relative mr-4 flex-shrink-0">
                    <motion.div 
                      whileHover={{ scale: 1.05 }}
                      className="w-12 h-12 bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-500 rounded-full flex items-center justify-center shadow-lg ring-2 ring-white dark:ring-gray-800 overflow-hidden"
                    >
                      <span className="text-white font-bold text-sm">
                        {conv.user.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                      </span>
                    </motion.div>
                    {onlineUsers.has(Number(conv.user.id)) && (
                      <motion.span 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -bottom-0.5 -right-0.5 block h-3.5 w-3.5 rounded-full bg-green-500 ring-2 ring-white dark:ring-gray-800 shadow-sm"
                      >
                        <motion.span
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="absolute inset-0 rounded-full bg-green-400 opacity-75"
                        />
                      </motion.span>
                    )}
                  </div>
                  
                  <div className="flex-grow overflow-hidden">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate text-sm">
                        {conv.user.full_name}
                      </h3>
                      <div className="flex items-center space-x-2">
                        {conv.last_message && (
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            {formatTimeAgo(conv.last_message.created_at)}
                          </span>
                        )}
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-all duration-200"
                        >
                          <Pin size={12} className="text-gray-400" />
                        </motion.button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate leading-relaxed">
                      {conv.last_message ? (
                        conv.last_message.message_type !== 'text' ? (
                          <span className="flex items-center">
                            <ImageIcon size={12} className="mr-1.5 inline-block"/>
                            <span className="capitalize">{conv.last_message.message_type}</span>
                          </span>
                        ) : (
                          conv.last_message.content
                        )
                      ) : (
                        <span className="italic">Start a new conversation</span>
                      )}
                    </p>
                  </div>
                  
                  {conv.unread_count > 0 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      whileHover={{ scale: 1.1 }}
                      className="bg-gradient-to-r from-primary-500 to-primary-600 text-white text-xs font-bold rounded-full h-5 min-w-5 flex items-center justify-center ml-2 px-1.5 shadow-lg"
                    >
                      {conv.unread_count > 99 ? '99+' : conv.unread_count}
                    </motion.div>
                  )}
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Enhanced Chat Window */}
      <div 
        className={`w-full md:w-2/3 ${userId ? 'flex' : 'hidden'} md:flex flex-col bg-white dark:bg-gray-800 relative`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        <AnimatePresence>
          {dragOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-primary-500/10 dark:bg-primary-400/10 backdrop-blur-sm z-50 flex items-center justify-center border-4 border-dashed border-primary-500 dark:border-primary-400 rounded-lg m-4"
            >
              <div className="text-center">
                <Paperclip size={48} className="text-primary-500 dark:text-primary-400 mx-auto mb-4" />
                <p className="text-lg font-semibold text-primary-600 dark:text-primary-400">Drop files here to send</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {activeConversation ? (
          <>
            {/* Enhanced Chat Header */}
            <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-750 border-b border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <motion.button 
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ x: -2 }}
                    onClick={() => navigate('/messages')} 
                    className="md:hidden mr-3 p-2 rounded-full hover:bg-white dark:hover:bg-gray-700 transition-all duration-300"
                  >
                    <ArrowLeft size={20} className="text-gray-500" />
                  </motion.button>
                  
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="relative mr-4"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-500 rounded-full flex items-center justify-center shadow-lg ring-2 ring-white dark:ring-gray-800">
                      <span className="text-white font-bold text-sm">
                        {activeConversation.user.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                      </span>
                    </div>
                    {onlineUsers.has(Number(activeConversation.user.id)) && (
                      <motion.span 
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute -bottom-0.5 -right-0.5 block h-3.5 w-3.5 rounded-full bg-green-500 ring-2 ring-white dark:ring-gray-800 shadow-sm"
                      />
                    )}
                  </motion.div>
                  
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {activeConversation.user.full_name}
                    </h2>
                    <AnimatePresence mode="wait">
                      {isTyping && (
                        <motion.div
                          key="typing"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="flex items-center text-xs text-primary-500 font-medium"
                        >
                          <span>typing</span>
                          <motion.span
                            animate={{ opacity: [0, 1, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="ml-1"
                          >
                            ...
                          </motion.span>
                        </motion.div>
                      )}
                      {!isTyping && onlineUsers.has(Number(activeConversation.user.id)) && (
                        <motion.p 
                          key="online"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-xs text-green-500 font-medium flex items-center"
                        >
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                          Active now
                        </motion.p>
                      )}
                      {!isTyping && !onlineUsers.has(Number(activeConversation.user.id)) && (
                        <motion.p 
                          key="offline"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-xs text-gray-400 font-medium"
                        >
                          Offline
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <motion.button 
                    whileHover={{ scale: 1.05, y: -1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => activeConversation && initiateCall(activeConversation.user)} 
                    className="p-3 rounded-xl hover:bg-white dark:hover:bg-gray-700 transition-all duration-300 text-gray-500 hover:text-primary-600 shadow-sm hover:shadow-md"
                  >
                    <Phone size={18} />
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.05, y: -1 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-3 rounded-xl hover:bg-white dark:hover:bg-gray-700 transition-all duration-300 text-gray-500 hover:text-primary-600 shadow-sm hover:shadow-md"
                  >
                    <Video size={18} />
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.05, y: -1 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-3 rounded-xl hover:bg-white dark:hover:bg-gray-700 transition-all duration-300 text-gray-500 shadow-sm hover:shadow-md"
                  >
                    <MoreVertical size={18} />
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Enhanced Messages Area */}
            <div className="flex-grow p-6 overflow-y-auto bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
              {isLoading ? (
                <div className="flex justify-center items-center h-full">
                  <motion.div className="flex flex-col items-center space-y-4">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="rounded-full h-10 w-10 border-3 border-primary-200 border-t-primary-600 shadow-lg"
                    />
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Loading messages...</p>
                  </motion.div>
                </div>
              ) : (
                <AnimatePresence>
                  {messages.map((msg, index) => (
                    <motion.div 
                      key={msg.id}
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -20, scale: 0.95 }}
                      transition={{ 
                        duration: 0.3, 
                        delay: index * 0.03,
                        type: "spring",
                        stiffness: 500,
                        damping: 25
                      }}
                      className={`flex my-4 ${msg.sender_id === currentUser.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-md relative group ${msg.sender_id === currentUser.id ? 'ml-16' : 'mr-16'}`}>
                        <motion.div 
                          whileHover={{ scale: 1.02 }}
                          className={`p-4 rounded-2xl shadow-lg transition-all duration-300 ${
                            msg.sender_id === currentUser.id 
                              ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-br-lg shadow-primary-500/25' 
                              : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-lg border border-gray-200 dark:border-gray-600 shadow-gray-300/25 dark:shadow-gray-900/25'
                          }`}
                        >
                          {/* Media Content */}
                          {msg.message_type === 'image' && msg.media_url && (
                            <motion.img 
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              whileHover={{ scale: 1.05 }}
                              src={msg.media_url} 
                              alt="sent content" 
                              className="rounded-xl max-w-xs mb-3 shadow-lg cursor-pointer hover:opacity-90 transition-all duration-300" 
                            />
                          )}
                          {msg.message_type === 'video' && msg.media_url && (
                            <video src={msg.media_url} controls className="rounded-xl max-w-xs mb-3 shadow-lg" />
                          )}
                          {msg.message_type === 'file' && msg.media_url && (
                            <motion.a 
                              whileHover={{ scale: 1.02, y: -1 }}
                              whileTap={{ scale: 0.98 }}
                              href={msg.media_url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              download 
                              className="flex items-center bg-gray-100 dark:bg-gray-600 p-3 rounded-xl mb-3 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 transition-all duration-300 shadow-md hover:shadow-lg"
                            >
                              <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                                <FileText className="text-primary-600 dark:text-primary-400" size={18} />
                              </div>
                              <div className="flex-grow overflow-hidden">
                                <p className="font-medium truncate text-sm">{msg.content || 'Download File'}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Click to download</p>
                              </div>
                              <Download className="ml-2 flex-shrink-0 text-gray-400" size={16} />
                            </motion.a>
                          )}
                          
                          {/* Text Content */}
                          {msg.content && msg.message_type === 'text' && (
                            <p className="whitespace-pre-wrap break-words leading-relaxed text-sm">
                              {msg.content}
                            </p>
                          )}
                          
                          {/* Message Status and Time */}
                          <div className="flex justify-end items-center mt-3">
                            {msg.status === 'sending' && (
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                className="mr-2"
                              >
                                <Clock size={12} className="text-white/70 dark:text-gray-100/70" />
                              </motion.div>
                            )}
                            {msg.status === 'failed' && (
                              <div className="mr-2" title="Failed to send">
                                <X size={12} className="text-red-300" />
                              </div>
                            )}
                            <span className="text-xs opacity-70 font-medium">
                              {formatTimeAgo(msg.created_at)}
                            </span>
                          </div>
                        </motion.div>
                        
                        {/* Message reactions placeholder */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 mt-1 flex justify-end">
                          <div className="flex space-x-1">
                            <motion.button
                              whileHover={{ scale: 1.2 }}
                              whileTap={{ scale: 0.8 }}
                              className="text-xs bg-white dark:bg-gray-700 rounded-full px-2 py-1 shadow-md border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200"
                            >
                              ❤️
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.2 }}
                              whileTap={{ scale: 0.8 }}
                              className="text-xs bg-white dark:bg-gray-700 rounded-full px-2 py-1 shadow-md border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200"
                            >
                              👍
                            </motion.button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Enhanced Message Input */}
            <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-750 border-t border-gray-200 dark:border-gray-700 shadow-lg">
              {/* File Preview */}
              <AnimatePresence>
                {file && (
                  <motion.div
                    initial={{ opacity: 0, y: 20, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -20, height: 0 }}
                    className="mb-4"
                  >
                    <div className="relative p-4 bg-white dark:bg-gray-700 rounded-2xl border border-gray-200 dark:border-gray-600 flex items-center max-w-md shadow-lg">
                      {file.type.startsWith('image/') ? (
                        <motion.img 
                          whileHover={{ scale: 1.05 }}
                          src={URL.createObjectURL(file)} 
                          alt="preview" 
                          className="w-14 h-14 object-cover rounded-xl mr-4 shadow-md" 
                        />
                      ) : (
                        <div className="w-14 h-14 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800 rounded-xl flex items-center justify-center mr-4 shadow-md">
                          <FileText className="text-primary-600 dark:text-primary-400" size={24} />
                        </div>
                      )}
                      <div className="flex-grow overflow-hidden">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {(file.size / 1024).toFixed(1)} KB • {file.type.split('/')[1].toUpperCase()}
                        </p>
                      </div>
                      <motion.button 
                        whileHover={{ scale: 1.1, rotate: 90 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => { 
                          setFile(null); 
                          if(fileInputRef.current) fileInputRef.current.value = ""; 
                        }} 
                        className="ml-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all duration-300"
                      >
                        <X size={18} />
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Emoji Picker */}
              <AnimatePresence>
                {showEmojiPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.9 }}
                    className="mb-4 p-4 bg-white dark:bg-gray-700 rounded-2xl border border-gray-200 dark:border-gray-600 shadow-lg"
                  >
                    <div className="grid grid-cols-8 gap-2">
                      {emojis.map((emoji, index) => (
                        <motion.button
                          key={emoji}
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.02 }}
                          whileHover={{ scale: 1.2 }}
                          whileTap={{ scale: 0.8 }}
                          onClick={() => insertEmoji(emoji)}
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200 text-lg"
                        >
                          {emoji}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input Form */}
              <form onSubmit={handleSendMessage} className="flex items-end space-x-3">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                />
                
                <motion.button 
                  type="button"
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => fileInputRef.current?.click()} 
                  className="p-3 text-gray-500 hover:text-primary-600 hover:bg-white dark:hover:bg-gray-700 rounded-full transition-all duration-300 shadow-md hover:shadow-lg"
                >
                  <Paperclip size={20} />
                </motion.button>
                
                <div className="flex-grow relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={newMessage}
                    onChange={(e) => handleTyping(e.target.value)}
                    placeholder="Type a message..."
                    className="w-full px-4 py-4 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-300 pr-12 shadow-md hover:shadow-lg"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                  />
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-2 rounded-full transition-all duration-300 ${
                      showEmojiPicker 
                        ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/30' 
                        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    <Smile size={18} />
                  </motion.button>
                </div>
                
                <motion.button 
                  type="submit"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={!newMessage.trim() && !file}
                  className="p-4 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white rounded-full transition-all duration-300 shadow-lg hover:shadow-xl disabled:shadow-md"
                >
                  <Send size={20} />
                </motion.button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-grow flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center max-w-md mx-auto px-6"
            >
              <motion.div 
                whileHover={{ scale: 1.05, rotate: 5 }}
                className="w-24 h-24 bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl"
              >
                <Send size={40} className="text-white" />
              </motion.div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                Select a conversation
              </h3>
              <p className="text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
                Choose a conversation from the sidebar to start messaging, or search for someone new to chat with.
              </p>
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="flex items-center justify-center space-x-4 text-sm text-gray-400"
              >
                <div className="flex items-center">
                  <Phone size={16} className="mr-1" />
                  <span>Voice calls</span>
                </div>
                <div className="w-1 h-1 bg-gray-300 rounded-full" />
                <div className="flex items-center">
                  <Video size={16} className="mr-1" />
                  <span>Video calls</span>
                </div>
                <div className="w-1 h-1 bg-gray-300 rounded-full" />
                <div className="flex items-center">
                  <Paperclip size={16} className="mr-1" />
                  <span>File sharing</span>
                </div>
              </motion.div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;