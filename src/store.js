import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authAPI, connectionsAPI } from './api'

// Auth Store
export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isLoading: true,
      
      login: async (credentials) => {
        try {
          const response = await authAPI.login(credentials)
          const { access_token, refresh_token } = response.data
          
          localStorage.setItem('access_token', access_token)
          localStorage.setItem('refresh_token', refresh_token)
          
          const profileResponse = await authAPI.getProfile()
          set({ user: profileResponse.data, isLoading: false })
          
          return { success: true }
        } catch (error) {
          set({ isLoading: false })
          return { 
            success: false, 
            error: error.response?.data?.detail || 'Login failed' 
          }
        }
      },
      
      register: async (userData) => {
        try {
          await authAPI.register(userData)
          return { success: true }
        } catch (error) {
          return { 
            success: false, 
            error: error.response?.data?.detail || 'Registration failed' 
          }
        }
      },
      
      logout: async () => {
        try {
          const refreshToken = localStorage.getItem('refresh_token')
          if (refreshToken) {
            await authAPI.logout(refreshToken)
          }
        } catch (error) {
          console.error('Logout error:', error)
        } finally {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          set({ user: null })
        }
      },
      
      initializeAuth: async () => {
        try {
          const token = localStorage.getItem('access_token')
          if (token) {
            const response = await authAPI.getProfile()
            set({ user: response.data, isLoading: false })
          } else {
            set({ isLoading: false })
          }
        } catch (error) {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          set({ user: null, isLoading: false })
        }
      },
      
      updateProfile: (updates) => {
        set(state => ({
          user: { ...state.user, ...updates }
        }))
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }),
    }
  )
)

// Posts Store
export const usePostsStore = create((set, get) => ({
  posts: [],
  isLoading: false,
  hasMore: true,
  page: 1,
  
  setPosts: (posts) => set({ posts }),
  
  addPost: (post) => set(state => ({ 
    posts: [post, ...state.posts] 
  })),
  
  updatePost: (postId, updates) => set(state => ({
    posts: state.posts.map(post => 
      post.id === postId ? { ...post, ...updates } : post
    )
  })),
  
  removePost: (postId) => set(state => ({
    posts: state.posts.filter(post => post.id !== postId)
  })),
  
  toggleLike: (postId) => set(state => ({
    posts: state.posts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          is_liked: !post.is_liked,
          likes_count: post.is_liked ? post.likes_count - 1 : post.likes_count + 1
        }
      }
      return post
    })
  })),
  
  setLoading: (isLoading) => set({ isLoading }),
  setHasMore: (hasMore) => set({ hasMore }),
  setPage: (page) => set({ page }),
  
  reset: () => set({
    posts: [],
    isLoading: false,
    hasMore: true,
    page: 1
  }),
}))

// Chat Store
export const useChatStore = create((set, get) => ({
  conversations: [],
  currentConversation: null,
  messages: [],
  onlineUsers: [],
  typingUsers: {},
  isConnected: false,
  
  setConversations: (conversations) => set({ conversations }),
  
  setCurrentConversation: (conversation) => set({ 
    currentConversation: conversation,
    messages: [] 
  }),
  
  setMessages: (messages) => set({ messages }),
  
  addMessage: (message) => set(state => ({
    messages: [...state.messages, message]
  })),
  
  updateMessage: (messageId, updates) => set(state => ({
    messages: state.messages.map(msg => 
      msg.id === messageId ? { ...msg, ...updates } : msg
    )
  })),
  
  setOnlineUsers: (users) => set({ onlineUsers: users }),
  
  setUserTyping: (userId, isTyping) => set(state => ({
    typingUsers: {
      ...state.typingUsers,
      [userId]: isTyping ? Date.now() : undefined
    }
  })),
  
  setConnectionStatus: (isConnected) => set({ isConnected }),
  
  updateConversationLastMessage: (userId, message) => set(state => ({
    conversations: state.conversations.map(conv => 
      conv.user.id === userId 
        ? { ...conv, last_message: message, unread_count: 0 }
        : conv
    )
  })),
}))

// Connections Store
export const useConnectionsStore = create((set, get) => ({
  friends: [],
  receivedRequests: [],
  sentRequests: [],
  suggestions: [],
  blockedUsers: [],
  
  setFriends: (friends) => set({ friends }),
  setSuggestions: (suggestions) => set({ suggestions }),
  setReceivedRequests: (requests) => set({ receivedRequests: requests }),
  setSentRequests: (requests) => set({ sentRequests: requests }),
  setBlockedUsers: (users) => set({ blockedUsers: users }),
  
  addFriend: (friend) => set(state => ({
    friends: [...state.friends, friend]
  })),
  
  removeFriend: (friendId) => set(state => ({
    friends: state.friends.filter(friend => friend.id !== friendId)
  })),
  
  removeRequest: (requestId) => set(state => ({
    receivedRequests: state.receivedRequests.filter(req => req.id !== requestId),
    sentRequests: state.sentRequests.filter(req => req.id !== requestId)
  })),
  
  removeSuggestion: (userId) => set(state => ({
    suggestions: state.suggestions.filter(user => user.id !== userId)
  })),
  
  blockUser: (user) => set(state => ({
    blockedUsers: [...state.blockedUsers, user],
    friends: state.friends.filter(friend => friend.id !== user.id),
    suggestions: state.suggestions.filter(suggestion => suggestion.id !== user.id)
  })),
  
  unblockUser: (userId) => set(state => ({
    blockedUsers: state.blockedUsers.filter(user => user.id !== userId)
  })),
}))

// UI Store
export const useUIStore = create((set) => ({
  theme: 'light',
  sidebarOpen: false,
  activeModal: null,
  notifications: [],
  
  toggleTheme: () => set(state => ({ 
    theme: state.theme === 'light' ? 'dark' : 'light' 
  })),
  
  setTheme: (theme) => set({ theme }),
  
  toggleSidebar: () => set(state => ({ 
    sidebarOpen: !state.sidebarOpen 
  })),
  
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  
  setActiveModal: (modal) => set({ activeModal: modal }),
  
  addNotification: (notification) => set(state => ({
    notifications: [...state.notifications, { 
      id: Date.now(), 
      ...notification 
    }]
  })),
  
  removeNotification: (id) => set(state => ({
    notifications: state.notifications.filter(notif => notif.id !== id)
  })),
  
  clearNotifications: () => set({ notifications: [] }),
}))

// WebRTC Store for video calls
export const useCallStore = create((set, get) => ({
  isInCall: false,
  callType: null, // 'audio' | 'video'
  caller: null,
  receiver: null,
  localStream: null,
  remoteStream: null,
  peerConnection: null,
  isRinging: false,
  isMuted: false,
  isVideoOff: false,
  
  startCall: (receiver, type) => set({
    isInCall: true,
    callType: type,
    receiver,
    isRinging: false
  }),
  
  receiveCall: (caller, type) => set({
    caller,
    callType: type,
    isRinging: true
  }),
  
  acceptCall: () => set({
    isInCall: true,
    isRinging: false,
    caller: null
  }),
  
  endCall: () => set({
    isInCall: false,
    callType: null,
    caller: null,
    receiver: null,
    localStream: null,
    remoteStream: null,
    peerConnection: null,
    isRinging: false,
    isMuted: false,
    isVideoOff: false
  }),
  
  setLocalStream: (stream) => set({ localStream: stream }),
  setRemoteStream: (stream) => set({ remoteStream: stream }),
  setPeerConnection: (pc) => set({ peerConnection: pc }),
  
  toggleMute: () => set(state => ({ isMuted: !state.isMuted })),
  toggleVideo: () => set(state => ({ isVideoOff: !state.isVideoOff })),
}))

// Initialize auth on app load
if (typeof window !== 'undefined') {
  useAuthStore.getState().initializeAuth()
}