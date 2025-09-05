import React from 'react'
import { Check, CheckCheck } from 'lucide-react'
import { motion } from 'framer-motion'

const ChatBubble = ({ message, isOwn }) => {
  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex mb-4 ${isOwn ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
        isOwn
          ? 'bg-primary-600 text-white rounded-br-sm'
          : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-sm shadow-soft'
      }`}>
        {/* Media content */}
        {message.media_url && (
          <div className="mb-2">
            {message.message_type === 'image' ? (
              <img
                src={`${import.meta.env.VITE_API_BASE_URL}${message.media_url}`}
                alt="Shared image"
                className="rounded-lg max-w-full h-auto"
              />
            ) : message.message_type === 'video' ? (
              <video
                src={`${import.meta.env.VITE_API_BASE_URL}${message.media_url}`}
                controls
                className="rounded-lg max-w-full h-auto"
              />
            ) : (
              <div className="bg-gray-100 dark:bg-gray-600 p-3 rounded-lg">
                <a
                  href={`${import.meta.env.VITE_API_BASE_URL}${message.media_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`font-medium ${
                    isOwn ? 'text-white' : 'text-primary-600'
                  }`}
                >
                  📎 View File
                </a>
              </div>
            )}
          </div>
        )}
        
        {/* Text content */}
        {message.content && (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
        )}
        
        {/* Time and read status */}
        <div className={`flex items-center mt-1 text-xs ${
          isOwn ? 'text-white/80 justify-end' : 'text-gray-500 dark:text-gray-400'
        }`}>
          <span>{formatTime(message.created_at)}</span>
          {isOwn && (
            <div className="ml-1">
              {message.is_read ? (
                <CheckCheck size={14} />
              ) : (
                <Check size={14} />
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default ChatBubble