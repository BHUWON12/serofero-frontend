import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { UserPlus, Check, X, Users, Search, MoreVertical, MessageSquare, UserCheck, Clock, Send } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { connectionsAPI, blockAPI } from '../api'
import { useConnectionsStore } from '../store'

const Connections = () => {
  const [activeTab, setActiveTab] = useState('friends')
  const [searchQuery, setSearchQuery] = useState('')
  const [openMenuId, setOpenMenuId] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  
  const {
    friends,
    receivedRequests,
    sentRequests,
    suggestions,
    setFriends,
    setReceivedRequests,
    setSentRequests,
    setSuggestions,
    addFriend,
    removeFriend,
    removeRequest,
    removeSuggestion,
    blockUser
  } = useConnectionsStore()

  useEffect(() => {
    loadConnectionsData()
  }, [])

  const loadConnectionsData = async () => {
    setIsLoading(true)
    try {
      const [friendsRes, receivedRes, sentRes, suggestionsRes] = await Promise.all([
        connectionsAPI.getFriends(),
        connectionsAPI.getReceivedRequests(),
        connectionsAPI.getSentRequests(),
        connectionsAPI.getSuggestions()
      ])
      
      setFriends(friendsRes.data)
      setReceivedRequests(receivedRes.data)
      setSentRequests(sentRes.data)
      setSuggestions(suggestionsRes.data)
    } catch (error) {
      console.error('Failed to load connections data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const sendFriendRequest = async (userId) => {
    try {
      await connectionsAPI.sendRequest(userId)
      removeSuggestion(userId)
      // Refresh sent requests
      const response = await connectionsAPI.getSentRequests()
      setSentRequests(response.data)
    } catch (error) {
      console.error('Failed to send friend request:', error)
    }
  }

  const acceptRequest = async (requestId) => {
    try {
      const response = await connectionsAPI.acceptRequest(requestId)
      removeRequest(requestId)
      addFriend(response.data)
    } catch (error) {
      console.error('Failed to accept request:', error)
    }
  }

  const rejectRequest = async (requestId) => {
    try {
      await connectionsAPI.rejectRequest(requestId)
      removeRequest(requestId)
    } catch (error) {
      console.error('Failed to reject request:', error)
    }
  }

  const handleUnfriend = async (friendId) => {
    if (!window.confirm('Are you sure you want to remove this friend?')) {
      return
    }
    
    try {
      await connectionsAPI.unfriend(friendId)
      removeFriend(friendId)
    } catch (error) {
      console.error('Failed to unfriend user:', error)
    }
  }

  const handleBlockUser = async (userId, user) => {
    if (!window.confirm('Are you sure you want to block this user? This will remove them from your connections.')) {
      return
    }
    
    try {
      await blockAPI.block(userId)
      blockUser(user)
    } catch (error) {
      console.error('Failed to block user:', error)
    }
  }

  const handleMenuToggle = (userId) => {
    setOpenMenuId(openMenuId === userId ? null : userId)
  }

  const handleInitiateChat = (user) => {
    navigate(`/messages/${user.id}`, { state: { user } })
  }

  const UserCard = ({ user, type, requestId, index = 0 }) => (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ y: -2, scale: 1.01 }}
      className="card p-6 flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-300 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-2xl"
    >
      <div className="flex items-center space-x-4">
        <div className="relative">
          {user.avatar_url ? (
            <motion.img
              whileHover={{ scale: 1.1 }}
              src={user.avatar_url}
              alt={user.full_name}
              className="w-14 h-14 rounded-2xl object-cover shadow-sm ring-2 ring-gray-100 dark:ring-gray-700"
            />
          ) : (
            <motion.div 
              whileHover={{ scale: 1.1 }}
              className="w-14 h-14 bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-500 rounded-2xl flex items-center justify-center shadow-sm"
            >
              <span className="text-white font-bold text-lg">
                {user.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
              </span>
            </motion.div>
          )}
          {type === 'friend' && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
          )}
        </div>
        
        <div className="flex-grow min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base truncate">
              {user.full_name}
            </h3>
            {type === 'friend' && (
              <UserCheck size={16} className="text-green-500 flex-shrink-0" />
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            @{user.username}
          </p>
          {user.bio && (
            <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
              {user.bio}
            </p>
          )}
        </div>
      </div>
      
      <div className="flex items-center space-x-3 flex-shrink-0">
        {type === 'suggestion' && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => sendFriendRequest(user.id)}
            className="btn-primary p-3 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 flex items-center space-x-2"
            title="Send Friend Request"
          >
            <UserPlus size={18} />
            <span className="hidden sm:inline text-sm font-medium">Add</span>
          </motion.button>
        )}
        
        {type === 'sent' && (
          <div className="flex items-center space-x-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
            <Clock size={16} className="text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Pending</span>
          </div>
        )}
        
        {type === 'received' && (
          <div className="flex items-center space-x-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => acceptRequest(requestId)}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm shadow-sm hover:shadow-md transition-all duration-200 flex items-center space-x-1"
            >
              <Check size={16} />
              <span>Accept</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => rejectRequest(requestId)}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm shadow-sm hover:shadow-md transition-all duration-200 flex items-center space-x-1"
            >
              <X size={16} />
              <span>Reject</span>
            </motion.button>
          </div>
        )}
        
        {type === 'friend' && (
          <div className="flex items-center space-x-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleInitiateChat(user)}
              className="btn-secondary p-3 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
              title="Start Chat"
            >
              <MessageSquare size={18} />
            </motion.button>
            
            <div className="relative">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleMenuToggle(user.id)}
                className="p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
              >
                <MoreVertical size={18} className="text-gray-500 dark:text-gray-400" />
              </motion.button>
              
              <AnimatePresence>
                {openMenuId === user.id && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 mt-2 w-44 bg-white dark:bg-gray-800 rounded-2xl shadow-xl z-20 border border-gray-200 dark:border-gray-700 overflow-hidden"
                  >
                    <div className="py-2">
                      <motion.button 
                        whileHover={{ backgroundColor: 'rgba(0,0,0,0.05)' }}
                        onClick={() => { handleUnfriend(user.id); handleMenuToggle(user.id); }}
                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 transition-colors duration-150 flex items-center space-x-2"
                      >
                        <X size={16} />
                        <span>Remove Friend</span>
                      </motion.button>
                      <motion.button 
                        whileHover={{ backgroundColor: 'rgba(239, 68, 68, 0.05)' }}
                        onClick={() => { handleBlockUser(user.id, user); handleMenuToggle(user.id); }}
                        className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 transition-colors duration-150 flex items-center space-x-2"
                      >
                        <Users size={16} />
                        <span>Block User</span>
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )

  const tabs = [
    { id: 'friends', label: 'Friends', count: friends.length, icon: UserCheck },
    { id: 'requests', label: 'Requests', count: receivedRequests.length, icon: Users },
    { id: 'sent', label: 'Sent', count: sentRequests.length, icon: Send },
    { id: 'suggestions', label: 'Suggestions', count: suggestions.length, icon: UserPlus },
  ]

  const getActiveData = () => {
    switch (activeTab) {
      case 'friends':
        return friends
      case 'requests':
        return receivedRequests
      case 'sent':
        return sentRequests
      case 'suggestions':
        return suggestions
      default:
        return []
    }
  }

  const filteredData = getActiveData().filter(item => {
    const user = item.sender || item.receiver || item
    const name = user.full_name?.toLowerCase() || ''
    const username = user.username?.toLowerCase() || ''
    const query = searchQuery.toLowerCase()
    
    return name.includes(query) || username.includes(query)
  })

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-white via-white to-gray-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-700 border-b border-gray-200 dark:border-gray-600 p-6 shadow-sm">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 tracking-tight">
            Connections
          </h1>
          
          {/* Enhanced Search */}
          <div className="relative">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="relative"
            >
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search connections..."
                className="input-field pl-12 pr-4 py-3 rounded-2xl border-2 focus:border-primary-500 transition-all duration-200 shadow-sm"
              />
              {searchQuery && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <X size={16} className="text-gray-400" />
                </motion.button>
              )}
            </motion.div>
          </div>
        </motion.div>
      </div>
      
      {/* Enhanced Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 overflow-x-auto flex-shrink-0 shadow-sm">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex space-x-2 p-6 min-w-max"
        >
          {tabs.map((tab, index) => {
            const Icon = tab.icon
            return (
              <motion.button
                key={tab.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.05 }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-5 py-3 rounded-2xl font-semibold text-sm whitespace-nowrap transition-all duration-300 shadow-sm ${
                  activeTab === tab.id
                    ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 shadow-md'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`px-2.5 py-1 text-xs rounded-full font-bold ${
                      activeTab === tab.id
                        ? 'bg-primary-200 dark:bg-primary-800 text-primary-800 dark:text-primary-200'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {tab.count}
                  </motion.span>
                )}
              </motion.button>
            )
          })}
        </motion.div>
      </div>
      
      {/* Enhanced Content */}
      <div className="flex-grow p-6 overflow-y-auto">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-16"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-600 mb-4"
              />
              <p className="text-gray-500 dark:text-gray-400 font-medium">Loading connections...</p>
            </motion.div>
          ) : filteredData.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-16"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="w-20 h-20 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm"
              >
                <Users size={40} className="text-gray-400 dark:text-gray-500" />
              </motion.div>
              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3"
              >
                {searchQuery ? 'No results found' : getEmptyStateText()}
              </motion.h3>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-gray-500 dark:text-gray-400 text-base leading-relaxed max-w-sm mx-auto"
              >
                {searchQuery ? 'Try searching with a different term' : getEmptyStateSubtext()}
              </motion.p>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {filteredData.map((item, index) => {
                const user = item.sender || item.receiver || item
                const type = activeTab === 'requests' ? 'received' : 
                            activeTab === 'suggestions' ? 'suggestion' : 
                            activeTab === 'friends' ? 'friend' : 'sent'
                
                return (
                  <UserCard
                    key={user.id}
                    user={user}
                    type={type}
                    requestId={item.id}
                    index={index}
                  />
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )

  function getEmptyStateText() {
    switch (activeTab) {
      case 'friends':
        return 'No friends yet'
      case 'requests':
        return 'No friend requests'
      case 'sent':
        return 'No sent requests'
      case 'suggestions':
        return 'No suggestions available'
      default:
        return 'Nothing here'
    }
  }

  function getEmptyStateSubtext() {
    switch (activeTab) {
      case 'friends':
        return 'Connect with people to build your network and start meaningful conversations'
      case 'requests':
        return 'Friend requests from other users will appear here when they want to connect'
      case 'sent':
        return 'Friend requests you\'ve sent to others will be tracked here'
      case 'suggestions':
        return 'We\'ll suggest people you might know based on your interests and connections'
      default:
        return ''
    }
  }
}

export default Connections