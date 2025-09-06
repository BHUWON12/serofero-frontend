import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Send, Phone, Video, MoreVertical, Paperclip, Smile, Image, FileText, X, MessageCircle } from 'lucide-react'
import { messagesAPI, connectionsAPI } from '../api'
import { useAuthStore, useConnectionsStore } from '../store'
import { useCall } from '../contexts/CallContext'
import ChatBubble from '../components/ChatBubble'

const Chat = () => {
  const { userId } = useParams()
  const navigate = useNavigate()
  
  const [conversations, setConversations] = useState([])
  const [currentChat, setCurrentChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [isTyping, setIsTyping] = useState(false)
  
  const { user } = useAuthStore()
  const { friends } = useConnectionsStore()
  const { initiateCall } = useCall()

  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    loadConversations()
  }, [])

  useEffect(() => {
    if (userId) {
      loadConversation(parseInt(userId))
    }
  }, [userId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadConversations = async () => {
    try {
      const response = await messagesAPI.getConversations()
      setConversations(response.data)
    } catch (error) {
      console.error('Failed to load conversations:', error)
    }
  }

  const loadConversation = async (chatUserId) => {
    setIsLoading(true)
    try {
      const response = await messagesAPI.getConversation(chatUserId)
      setMessages(response.data)
      
      // Find user info
      const chatUser = friends.find(f => f.id === chatUserId) || 
                      conversations.find(c => c.user.id === chatUserId)?.user
      
      setCurrentChat(chatUser)
    } catch (error) {
      console.error('Failed to load conversation:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() && !selectedFile) return
    if (!userId) return

    try {
      const formData = new FormData()
      formData.append('content', newMessage)
      formData.append('receiver_id', userId)
      
      if (selectedFile) {
        formData.append('file', selectedFile)
        formData.append('message_type', selectedFile.type.startsWith('image/') ? 'image' : 'file')
      }

      const response = await messagesAPI.send(formData)
      setMessages(prev => [...prev, response.data])

      // Clear form
      setNewMessage('')
      setSelectedFile(null)

      // Note: WebSocket message is handled by the backend API
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const handleTyping = (e) => {
    setNewMessage(e.target.value)
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const startCall = (type) => {
    if (currentChat) {
      initiateCall(currentChat)
    }
  }

  const formatTime = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now - date) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  const getFileIcon = (file) => {
    if (file.type.startsWith('image/')) return Image
    return FileText
  }

  // Chat list view
  if (!userId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        {/* Enhanced Header */}
        <div className="bg-gradient-to-r from-white via-white to-gray-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-700 border-b border-gray-200 dark:border-gray-600 p-6 shadow-sm">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center space-x-4"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/feed')}
              className="p-3 rounded-2xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 shadow-sm"
            >
              <ArrowLeft size={24} className="text-gray-600 dark:text-gray-300" />
            </motion.button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                Messages
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
              </p>
            </div>
          </motion.div>
        </div>
        
        {/* Enhanced Conversations */}
        <div className="p-4">
          <AnimatePresence>
            {conversations.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-20"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm"
                >
                  <MessageCircle size={48} className="text-gray-400 dark:text-gray-500" />
                </motion.div>
                <motion.h3
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3"
                >
                  No conversations yet
                </motion.h3>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-gray-500 dark:text-gray-400 text-base leading-relaxed max-w-sm mx-auto"
                >
                  Start meaningful conversations with your friends and build stronger connections
                </motion.p>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {conversations.map((conversation, index) => (
                  <motion.button
                    key={conversation.user.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate(`/chat/${conversation.user.id}`)}
                    className="w-full p-5 flex items-center space-x-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 rounded-2xl shadow-sm hover:shadow-md border border-gray-200 dark:border-gray-700"
                  >
                    <div className="relative">
                      {conversation.user.avatar_url ? (
                        <img
                          src={conversation.user.avatar_url}
                          alt={conversation.user.full_name}
                          className="w-14 h-14 rounded-2xl object-cover shadow-sm ring-2 ring-gray-100 dark:ring-gray-700"
                        />
                      ) : (
                        <div className="w-14 h-14 bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-500 rounded-2xl flex items-center justify-center shadow-sm">
                          <span className="text-white font-bold text-lg">
                            {conversation.user.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </span>
                        </div>
                      )}
                      
                      {/* Online indicator */}
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                      
                      {conversation.unread_count > 0 && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-2 -right-2 min-w-6 h-6 bg-primary-600 text-white text-xs font-bold rounded-full flex items-center justify-center px-1.5 shadow-lg"
                        >
                          {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                        </motion.div>
                      )}
                    </div>
                    
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base truncate">
                          {conversation.user.full_name}
                        </h3>
                        {conversation.last_message && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium flex-shrink-0 ml-2">
                            {formatTime(conversation.last_message.created_at)}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-400 dark:text-gray-500 mb-1">
                        @{conversation.user.username}
                      </p>
                      
                      {conversation.last_message && (
                        <div className="flex items-center space-x-1">
                          <p className="text-sm text-gray-600 dark:text-gray-300 truncate flex-1">
                            {conversation.last_message.content || '📎 Attachment'}
                          </p>
                          {conversation.last_message.message_type === 'image' && (
                            <Image size={14} className="text-gray-400 flex-shrink-0" />
                          )}
                          {conversation.last_message.message_type === 'file' && (
                            <FileText size={14} className="text-gray-400 flex-shrink-0" />
                          )}
                        </div>
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    )
  }

  // Individual chat view
  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-white via-white to-gray-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-700 border-b border-gray-200 dark:border-gray-600 p-4 shadow-sm">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center space-x-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/chat')}
              className="p-3 rounded-2xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200"
            >
              <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
            </motion.button>
            
            {currentChat && (
              <div className="flex items-center space-x-3">
                <div className="relative">
                  {currentChat.avatar_url ? (
                    <img
                      src={currentChat.avatar_url}
                      alt={currentChat.full_name}
                      className="w-12 h-12 rounded-2xl object-cover shadow-sm ring-2 ring-gray-100 dark:ring-gray-700"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-500 rounded-2xl flex items-center justify-center shadow-sm">
                      <span className="text-white font-bold">
                        {currentChat.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                </div>
                
                <div>
                  <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-base">
                    {currentChat.full_name}
                  </h2>
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                    Online now
                  </p>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-1">
            {[
              { icon: Phone, action: () => startCall('audio'), label: 'Voice call' },
              { icon: Video, action: () => startCall('video'), label: 'Video call' },
              { icon: MoreVertical, action: () => {}, label: 'More options' }
            ].map((item, index) => (
              <motion.button
                key={index}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={item.action}
                className="p-3 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-all duration-200"
                title={item.label}
              >
                <item.icon size={20} />
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>
      
      {/* Enhanced Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <AnimatePresence>
          {isLoading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-12"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="rounded-full h-10 w-10 border-3 border-primary-200 border-t-primary-600 mb-3"
              />
              <p className="text-gray-500 dark:text-gray-400 font-medium">Loading messages...</p>
            </motion.div>
          ) : (
            <>
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <ChatBubble
                    message={message}
                    isOwn={message.sender_id === user.id}
                  />
                </motion.div>
              ))}
              
              {/* Enhanced Typing indicator */}
              <AnimatePresence>
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex justify-start mb-4"
                  >
                    <div className="bg-white dark:bg-gray-700 px-5 py-3 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-600">
                      <div className="flex space-x-1">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{
                              duration: 0.6,
                              repeat: Infinity,
                              delay: i * 0.1
                            }}
                            className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full"
                          />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <div ref={messagesEndRef} />
            </>
          )}
        </AnimatePresence>
      </div>
      
      {/* Enhanced File preview */}
      <AnimatePresence>
        {selectedFile && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4"
          >
            <div className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 p-4 rounded-2xl border border-gray-200 dark:border-gray-600">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
                  {React.createElement(getFileIcon(selectedFile), {
                    size: 20,
                    className: "text-primary-600 dark:text-primary-400"
                  })}
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200 block truncate max-w-48">
                    {selectedFile.name}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setSelectedFile(null)}
                className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-200"
              >
                <X size={18} />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Enhanced Input */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-end space-x-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => fileInputRef.current?.click()}
            className="p-3 rounded-2xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-all duration-200 flex-shrink-0"
          >
            <Paperclip size={20} />
          </motion.button>
          
          <div className="flex-1 relative">
            <motion.div
              whileFocus={{ scale: 1.02 }}
              className="relative"
            >
              <textarea
                value={newMessage}
                onChange={handleTyping}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage()
                  }
                }}
                placeholder="Type a message..."
                rows={1}
                className="w-full py-3 px-4 pr-12 bg-gray-100 dark:bg-gray-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-gray-100 resize-none max-h-32 transition-all duration-200 border border-transparent focus:border-primary-200 dark:focus:border-primary-800"
                style={{ minHeight: '48px' }}
              />
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="absolute right-3 bottom-3 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <Smile size={18} />
              </motion.button>
            </motion.div>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={sendMessage}
            disabled={!newMessage.trim() && !selectedFile}
            className={`p-3 rounded-2xl transition-all duration-200 flex-shrink-0 shadow-sm ${
              newMessage.trim() || selectedFile
                ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-md'
                : 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Send size={20} />
          </motion.button>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          accept="image/*,video/*,.pdf,.doc,.docx"
          className="hidden"
        />
      </div>
    </div>
  )
}

export default Chat