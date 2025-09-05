import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { UserPlus, Check, X, Users, Search, MoreVertical, MessageSquare } from 'lucide-react'
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

  const UserCard = ({ user, type, requestId }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-4 flex items-center justify-between"
    >
      <div className="flex items-center space-x-3">
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={user.full_name}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold">
              {user.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
            </span>
          </div>
        )}
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            {user.full_name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            @{user.username}
          </p>
          {user.bio && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              {user.bio}
            </p>
          )}
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        {type === 'suggestion' && (
          <motion.button
            whilePressed={{ scale: 0.95 }}
            onClick={() => sendFriendRequest(user.id)}
            className="btn-primary p-2"
          >
            <UserPlus size={18} />
          </motion.button>
        )}
        
        {type === 'received' && (
          <>
            <motion.button
              whilePressed={{ scale: 0.95 }}
              onClick={() => acceptRequest(requestId)}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded-lg text-sm"
            >
              Accept
            </motion.button>
            <motion.button
              whilePressed={{ scale: 0.95 }}
              onClick={() => rejectRequest(requestId)}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded-lg text-sm"
            >
              Reject
            </motion.button>
          </>
        )}
        
        {type === 'friend' && (
          <>
            <motion.button
              whilePressed={{ scale: 0.95 }}
              onClick={() => handleInitiateChat(user)}
              className="btn-secondary p-2"
              title="Chat"
            >
              <MessageSquare size={18} />
            </motion.button>
            <div className="relative">
              <button 
                onClick={() => handleMenuToggle(user.id)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <MoreVertical size={18} className="text-gray-500" />
              </button>
              {openMenuId === user.id && (
                <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 border border-gray-200 dark:border-gray-700">
                  <ul className="py-1">
                    <li>
                      <button 
                        onClick={() => { handleUnfriend(user.id); handleMenuToggle(user.id); }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                      >Unfriend</button>
                    </li>
                    <li>
                      <button 
                        onClick={() => { handleBlockUser(user.id, user); handleMenuToggle(user.id); }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover-bg-gray-600"
                      >Block User</button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </motion.div>
  )

  const tabs = [
    { id: 'friends', label: 'Friends', count: friends.length },
    { id: 'requests', label: 'Requests', count: receivedRequests.length },
    { id: 'sent', label: 'Sent', count: sentRequests.length },
    { id: 'suggestions', label: 'Suggestions', count: suggestions.length },
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
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header (fixed) */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Connections
        </h1>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search connections..."
            className="input-field pl-10"
          />
        </div>
      </div>
      
      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 overflow-x-auto flex-shrink-0">
        <div className="flex space-x-1 p-4 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                  activeTab === tab.id
                    ? 'bg-primary-200 dark:bg-primary-800 text-primary-800 dark:text-primary-200'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      
      {/* Content (scrollable) */}
      <div className="flex-grow p-4 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              {searchQuery ? 'No results found' : getEmptyStateText()}
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery ? 'Try searching with a different term' : getEmptyStateSubtext()}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredData.map((item) => {
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
                />
              )
            })}
          </div>
        )}
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
        return 'No suggestions'
      default:
        return 'Nothing here'
    }
  }

  function getEmptyStateSubtext() {
    switch (activeTab) {
      case 'friends':
        return 'Connect with people to build your network'
      case 'requests':
        return 'Friend requests will appear here'
      case 'sent':
        return 'Requests you sent will appear here'
      case 'suggestions':
        return 'We\'ll suggest people you might know'
      default:
        return ''
    }
  }
}

export default Connections
