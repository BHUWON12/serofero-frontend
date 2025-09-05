import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Send, Phone, Video, MoreVertical, Paperclip, Smile } from 'lucide-react'
import { messagesAPI, connectionsAPI } from '../api'
import { useChatStore, useAuthStore, useConnectionsStore } from '../store'
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
  const wsRef = useRef(null)
  const [ws, setWs] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [isTyping, setIsTyping] = useState(false)
  
  const { user } = useAuthStore()
  const { friends } = useConnectionsStore()
  const { initiateCall } = useCall()

  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  useEffect(() => {
    loadConversations()
    initWebSocket()
    
    return () => {
      // ensure any open websocket is closed on unmount
      if (wsRef.current) {
        try { wsRef.current.close() } catch (e) { /* ignore */ }
        wsRef.current = null
        setWs(null)
      }
    }
  }, [])

  useEffect(() => {
    if (userId) {
      loadConversation(parseInt(userId))
    }
  }, [userId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const initWebSocket = () => {
    if (!user?.id) {
      console.log('No user ID available for WebSocket connection')
      return
    }

    const token = localStorage.getItem('access_token')
    if (!token) {
      console.log('No access token available for WebSocket connection')
      return
    }

    // Prefer explicit WS base if provided; fall back to API base or localhost
    const rawBase = import.meta.env.VITE_WS_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'ws://localhost:8000'
    let base = String(rawBase).trim()

    // Normalize scheme to ws/wss
    if (base.startsWith('http://')) {
      base = base.replace('http://', 'ws://')
    } else if (base.startsWith('https://')) {
      base = base.replace('https://', 'wss://')
    } else if (!base.startsWith('ws://') && !base.startsWith('wss://')) {
      base = 'ws://' + base
    }

    const wsUrl = `${base.replace(/\/$/, '')}/ws/${user.id}?token=${encodeURIComponent(token)}`
    console.log('Connecting to WebSocket:', wsUrl.replace(token, '[TOKEN]'))

    try {
      const websocket = new WebSocket(wsUrl)

      // keep a ref to the active socket so cleanup/reconnect logic can access it reliably
      wsRef.current = websocket

      websocket.onopen = () => {
        console.log('✅ WebSocket connected successfully')
        setWs(websocket)
      }

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          handleWebSocketMessage(data)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error, event.data)
        }
      }

      websocket.onclose = (event) => {
        console.log('❌ WebSocket disconnected:', event.code, event.reason)
        // clear refs/state only if this is the current socket
        if (wsRef.current === websocket) {
          wsRef.current = null
          setWs(null)
        }
        // Reconnect after 3 seconds if not a policy violation
        if (event.code !== 1008) {
          setTimeout(() => {
            // don't create duplicate sockets
            if (!wsRef.current) initWebSocket()
          }, 3000)
        } else {
          console.error('WebSocket authentication failed')
        }
      }

      websocket.onerror = (error) => {
        console.error('WebSocket error:', error)
      }
    } catch (e) {
      console.error('Failed to create WebSocket:', e)
    }
  }

  const handleWebSocketMessage = (data) => {
    console.log('WebSocket message received:', data)
    
    switch (data.type) {
      case 'new_message':
        // Only add message if it's part of the current conversation
        if (userId && (data.data.sender_id === parseInt(userId) || data.data.receiver_id === parseInt(userId))) {
          setMessages(prev => {
            // Check if message already exists to avoid duplicates
            const exists = prev.some(msg => msg.id === data.data.id)
            if (!exists) {
              return [...prev, data.data]
            }
            return prev
          })
          
          // Play notification sound if it's from the other user
          if (data.data.sender_id === parseInt(userId)) {
            try {
              const audio = new Audio('/src/assets/chatmessage.mp3')
              audio.play().catch(e => console.log('Could not play notification sound:', e))
            } catch (e) {
              console.log('Could not play notification sound:', e)
            }
          }
        }
        break
        
      case 'message_updated':
        // Update existing message
        if (userId && (data.data.sender_id === parseInt(userId) || data.data.receiver_id === parseInt(userId))) {
          setMessages(prev => prev.map(msg =>
            msg.id === data.data.id ? data.data : msg
          ))
        }
        break
        
      case 'typing_start':
        if (data.data && data.data.user_id === parseInt(userId)) {
          setIsTyping(true)
        }
        break
        
      case 'typing_stop':
        if (data.data && data.data.user_id === parseInt(userId)) {
          setIsTyping(false)
        }
        break
        
      case 'conversation_update':
        // Refresh conversations list
        loadConversations()
        break
        
      default:
        console.log('Unknown WebSocket message type:', data.type)
        break
    }
  }

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
    
    const sock = wsRef.current
    // Send typing indicator only if socket is open
    if (sock && sock.readyState === WebSocket.OPEN && userId) {
      try {
        sock.send(JSON.stringify({
          type: 'typing_start',
          data: { receiver_id: parseInt(userId) }
        }))
      } catch (err) {
        console.warn('Failed to send typing_start over WS:', err)
      }
      
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      
      // Stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        try {
          if (sock && sock.readyState === WebSocket.OPEN) {
            sock.send(JSON.stringify({
              type: 'typing_stop',
              data: { receiver_id: parseInt(userId) }
            }))
          }
        } catch (err) {
          console.warn('Failed to send typing_stop over WS:', err)
        }
      }, 2000)
    }
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

  // Chat list view
  if (!userId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center space-x-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/feed')}
              className="p-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ArrowLeft size={24} className="text-gray-600 dark:text-gray-400" />
            </motion.button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Messages
            </h1>
          </div>
        </div>
        
        {/* Conversations */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {conversations.map((conversation) => (
            <motion.button
              key={conversation.user.id}
              whilePressed={{ scale: 0.98 }}
              onClick={() => navigate(`/chat/${conversation.user.id}`)}
              className="w-full p-4 flex items-center space-x-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold">
                  {conversation.user.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </span>
              </div>
              
              <div className="flex-1 text-left">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    {conversation.user.full_name}
                  </h3>
                  {conversation.last_message && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(conversation.last_message.created_at).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  )}
                </div>
                
                {conversation.last_message && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {conversation.last_message.content || '📎 Attachment'}
                  </p>
                )}
                
                {conversation.unread_count > 0 && (
                  <div className="inline-flex items-center justify-center w-5 h-5 bg-primary-600 text-white text-xs rounded-full mt-1">
                    {conversation.unread_count}
                  </div>
                )}
              </div>
            </motion.button>
          ))}
          
          {conversations.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send size={32} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No conversations yet
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Start a conversation with your friends!
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Individual chat view
  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/chat')}
              className="p-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ArrowLeft size={24} className="text-gray-600 dark:text-gray-400" />
            </motion.button>
            
            {currentChat && (
              <>
                <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {currentChat.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </span>
                </div>
                
                <div>
                  <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                    {currentChat.full_name}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    @{currentChat.username}
                  </p>
                </div>
              </>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => startCall('audio')}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
            >
              <Phone size={20} />
            </button>
            <button
              onClick={() => startCall('video')}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
            >
              <Video size={20} />
            </button>
            <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400">
              <MoreVertical size={20} />
            </button>
          </div>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatBubble
                key={message.id}
                message={message}
                isOwn={message.sender_id === user.id}
              />
            ))}
            
            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start mb-4">
                <div className="bg-white dark:bg-gray-700 px-4 py-2 rounded-2xl shadow-soft">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      
      {/* File preview */}
      {selectedFile && (
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3">
          <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 p-2 rounded">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              📎 {selectedFile.name}
            </span>
            <button
              onClick={() => setSelectedFile(null)}
              className="text-red-500 hover:text-red-600"
            >
              ×
            </button>
          </div>
        </div>
      )}
      
      {/* Input */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
          >
            <Paperclip size={20} />
          </button>
          
          <div className="flex-1 relative">
            <input
              type="text"
              value={newMessage}
              onChange={handleTyping}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message..."
              className="w-full py-2 px-4 pr-10 bg-gray-100 dark:bg-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-gray-100"
            />
            <button className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              <Smile size={18} />
            </button>
          </div>
          
          <motion.button
            whilePressed={{ scale: 0.95 }}
            onClick={sendMessage}
            disabled={!newMessage.trim() && !selectedFile}
            className="p-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-full transition-colors"
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
