import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, UserX, Shield } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { blockAPI } from '../api'

const Blocked = () => {
  const [blockedUsers, setBlockedUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    loadBlockedUsers()
  }, [])

  const loadBlockedUsers = async () => {
    try {
      const response = await blockAPI.getBlocked()
      setBlockedUsers(response.data)
    } catch (error) {
      console.error('Failed to load blocked users:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnblock = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to unblock ${userName}?`)) {
      return
    }

    try {
      await blockAPI.unblock(userId)
      setBlockedUsers(prev => prev.filter(block => block.blocked.id !== userId))
    } catch (error) {
      console.error('Failed to unblock user:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Blocked Users
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage your blocked users
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : blockedUsers.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No blocked users
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Users you block will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {blockedUsers.map((block) => (
              <motion.div
                key={block.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-4 flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold">
                      {block.blocked.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                      {block.blocked.full_name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      @{block.blocked.username}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Blocked {new Date(block.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <motion.button
                  whilePressed={{ scale: 0.95 }}
                  onClick={() => handleUnblock(block.blocked.id, block.blocked.full_name)}
                  className="bg-success-600 hover:bg-success-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Unblock
                </motion.button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="p-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Shield className="text-blue-600 dark:text-blue-400 mt-0.5" size={20} />
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                About Blocking
              </h4>
              <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <p>• Blocked users cannot message you or call you</p>
                <p>• They won't see your posts in their feed</p>
                <p>• You won't see their posts or comments</p>
                <p>• Existing friendships will be removed</p>
                <p>• They won't be notified that you blocked them</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Blocked