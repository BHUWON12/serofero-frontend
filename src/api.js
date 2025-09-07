import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://fastapi-backend-447658426881.asia-south1.run.app'

// Ensure HTTPS
const ensureHttps = (url) => {
  if (url && url.startsWith('http://')) {
    return url.replace('http://', 'https://')
  }
  return url
}

// Create axios instance
const api = axios.create({
  baseURL: ensureHttps(API_BASE_URL),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
})

// Token management utilities
const tokenManager = {
  getAccessToken: () => localStorage.getItem('access_token'),
  getRefreshToken: () => localStorage.getItem('refresh_token'),
  setTokens: (accessToken, refreshToken) => {
    if (accessToken) localStorage.setItem('access_token', accessToken)
    if (refreshToken) localStorage.setItem('refresh_token', refreshToken)
  },
  clearTokens: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
  },
  hasValidTokens: () => {
    return !!(tokenManager.getAccessToken() && tokenManager.getRefreshToken())
  }
}

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = tokenManager.getAccessToken()
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    } else {
      console.warn('No access token found for request:', config.url)
    }
    
    // Log request for debugging (remove in production)
    if (process.env.NODE_ENV === 'development') {
      console.log('API Request:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        hasAuth: !!token,
        baseURL: config.baseURL
      })
    }
    
    return config
  },
  (error) => {
    console.error('Request interceptor error:', error)
    return Promise.reject(error)
  }
)

// Enhanced response interceptor with better error handling
api.interceptors.response.use(
  (response) => {
    // Log successful responses in development
    if (process.env.NODE_ENV === 'development') {
      console.log('API Response:', {
        status: response.status,
        url: response.config.url,
        data: response.data
      })
    }
    return response
  },
  async (error) => {
    const originalRequest = error.config
    
    // Log all errors for debugging
    console.error('API Error:', {
      status: error.response?.status,
      url: error.config?.url,
      message: error.message,
      data: error.response?.data
    })

    // Handle 401 (Unauthorized) errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const refreshToken = tokenManager.getRefreshToken()
      
      if (!refreshToken) {
        console.warn('No refresh token available, redirecting to login')
        tokenManager.clearTokens()
        redirectToLogin()
        return Promise.reject(error)
      }

      try {
        console.log('Attempting token refresh...')
        
        // Make refresh request without interceptors to avoid infinite loop
        const refreshResponse = await axios.post(`${ensureHttps(API_BASE_URL)}/auth/refresh`, {
          refresh_token: refreshToken
        }, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        })

        const { access_token, refresh_token: newRefreshToken } = refreshResponse.data
        
        if (access_token) {
          tokenManager.setTokens(access_token, newRefreshToken)
          originalRequest.headers.Authorization = `Bearer ${access_token}`
          
          console.log('Token refresh successful, retrying original request')
          return api(originalRequest)
        } else {
          throw new Error('No access token in refresh response')
        }
        
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError.response?.data || refreshError.message)
        
        // Clear tokens and redirect to login
        tokenManager.clearTokens()
        redirectToLogin()
        
        return Promise.reject(refreshError)
      }
    }

    // Handle network errors
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      console.error('Request timeout or network error')
      error.userMessage = 'Request timed out. Please check your internet connection and try again.'
    }

    // Handle specific error cases
    if (error.response?.status === 403) {
      error.userMessage = 'Access forbidden. You may not have permission for this action.'
    }

    if (error.response?.status === 404) {
      error.userMessage = 'Resource not found.'
    }

    if (error.response?.status >= 500) {
      error.userMessage = 'Server error. Please try again later.'
    }

    return Promise.reject(error)
  }
)

// Helper function to redirect to login
const redirectToLogin = () => {
  // Avoid redirect loops
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

// Enhanced error handler for API calls
const handleApiError = (error, context = '') => {
  const errorMessage = error.response?.data?.detail || 
                      error.response?.data?.message || 
                      error.userMessage ||
                      error.message ||
                      'An unexpected error occurred'
  
  console.error(`API Error in ${context}:`, errorMessage)
  
  // You can integrate with a toast/notification system here
  // toast.error(errorMessage)
  
  throw new Error(errorMessage)
}

// Auth API with better error handling
export const authAPI = {
  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', userData)
      return response
    } catch (error) {
      handleApiError(error, 'register')
    }
  },
  
  login: async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials)
      const { access_token, refresh_token, user } = response.data
      
      // Store tokens and user data
      tokenManager.setTokens(access_token, refresh_token)
      if (user) {
        localStorage.setItem('user', JSON.stringify(user))
      }
      
      return response
    } catch (error) {
      handleApiError(error, 'login')
    }
  },
  
  logout: async () => {
    try {
      const refreshToken = tokenManager.getRefreshToken()
      if (refreshToken) {
        await api.post('/auth/logout', { refresh_token: refreshToken })
      }
    } catch (error) {
      console.warn('Logout request failed:', error.message)
    } finally {
      tokenManager.clearTokens()
    }
  },
  
  getProfile: async () => {
    try {
      if (!tokenManager.hasValidTokens()) {
        throw new Error('No valid authentication tokens')
      }
      return await api.get('/auth/me')
    } catch (error) {
      handleApiError(error, 'getProfile')
    }
  },
  
  forgotPassword: async (email) => {
    try {
      return await api.post('/auth/forgot-password', { email })
    } catch (error) {
      handleApiError(error, 'forgotPassword')
    }
  },
}

// User API
export const userAPI = {
  uploadProfilePhoto: async (file) => {
    try {
      if (!tokenManager.hasValidTokens()) {
        throw new Error('Please log in to upload profile photo')
      }
      
      const formData = new FormData()
      formData.append("file", file)
      
      return await api.post("/auth/profile/photo", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      })
    } catch (error) {
      handleApiError(error, 'uploadProfilePhoto')
    }
  }
}

// Enhanced Posts API with authentication checks
export const postsAPI = {
  create: async (formData) => {
    try {
      if (!tokenManager.hasValidTokens()) {
        throw new Error('Please log in to create posts')
      }
      
      return await api.post('/posts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    } catch (error) {
      handleApiError(error, 'createPost')
    }
  },
  
  get: async (postId) => {
    try {
      return await api.get(`/posts/${postId}`)
    } catch (error) {
      handleApiError(error, 'getPost')
    }
  },
  
  getMyPosts: async (skip = 0, limit = 50) => {
    try {
      if (!tokenManager.hasValidTokens()) {
        throw new Error('Please log in to view your posts')
      }
      
      return await api.get('/posts/my-posts/', {
        params: { skip, limit }
      })
    } catch (error) {
      handleApiError(error, 'getMyPosts')
    }
  },
  
  like: async (postId) => {
    try {
      if (!tokenManager.hasValidTokens()) {
        throw new Error('Please log in to like posts')
      }
      
      return await api.post(`/posts/${postId}/like`)
    } catch (error) {
      handleApiError(error, 'likePost')
    }
  },
  
  addComment: async (postId, data) => {
    try {
      if (!tokenManager.hasValidTokens()) {
        throw new Error('Please log in to comment')
      }
      
      return await api.post(`/posts/${postId}/comment`, data)
    } catch (error) {
      handleApiError(error, 'addComment')
    }
  },
  
  getComments: async (postId, skip = 0, limit = 50) => {
    try {
      return await api.get(`/posts/${postId}/comments`, {
        params: { skip, limit }
      })
    } catch (error) {
      handleApiError(error, 'getComments')
    }
  },
  
  deleteComment: async (commentId) => {
    try {
      if (!tokenManager.hasValidTokens()) {
        throw new Error('Please log in to delete comments')
      }
      
      return await api.delete(`/posts/comments/${commentId}`)
    } catch (error) {
      handleApiError(error, 'deleteComment')
    }
  },
  
  deletePost: async (postId) => {
    try {
      if (!tokenManager.hasValidTokens()) {
        throw new Error('Please log in to delete posts')
      }
      
      return await api.delete(`/posts/${postId}`)
    } catch (error) {
      handleApiError(error, 'deletePost')
    }
  },
}

// Enhanced Feed API - This is the main fix for your issue
export const feedAPI = {
  getFeed: async (page = 1, limit = 10) => {
    try {
      if (!tokenManager.hasValidTokens()) {
        console.warn('No valid tokens for feed request')
        throw new Error('Please log in to view your feed')
      }
      
      console.log('Fetching feed:', { page, limit, hasTokens: tokenManager.hasValidTokens() })
      
      return await api.get('/feed', {
        params: { page, limit }
      })
    } catch (error) {
      handleApiError(error, 'getFeed')
    }
  },
  
  getTrending: async (limit = 20) => {
    try {
      if (!tokenManager.hasValidTokens()) {
        throw new Error('Please log in to view trending posts')
      }
      
      return await api.get('/feed/trending', {
        params: { limit }
      })
    } catch (error) {
      handleApiError(error, 'getTrending')
    }
  },
}

// Enhanced Connections API
export const connectionsAPI = {
  sendRequest: async (receiverId) => {
    try {
      if (!tokenManager.hasValidTokens()) {
        throw new Error('Please log in to send connection requests')
      }
      
      return await api.post('/connections/request', { receiver_id: receiverId })
    } catch (error) {
      handleApiError(error, 'sendConnectionRequest')
    }
  },
  
  getReceivedRequests: async () => {
    try {
      if (!tokenManager.hasValidTokens()) {
        throw new Error('Please log in to view connection requests')
      }
      
      return await api.get('/connections/requests/received')
    } catch (error) {
      handleApiError(error, 'getReceivedRequests')
    }
  },
  
  getSentRequests: async () => {
    try {
      if (!tokenManager.hasValidTokens()) {
        throw new Error('Please log in to view sent requests')
      }
      
      return await api.get('/connections/requests/sent')
    } catch (error) {
      handleApiError(error, 'getSentRequests')
    }
  },
  
  getFriends: async () => {
    try {
      if (!tokenManager.hasValidTokens()) {
        throw new Error('Please log in to view friends')
      }
      
      return await api.get('/connections/friends')
    } catch (error) {
      handleApiError(error, 'getFriends')
    }
  },
  
  getSuggestions: async (limit = 10) => {
    try {
      if (!tokenManager.hasValidTokens()) {
        throw new Error('Please log in to view suggestions')
      }
      
      return await api.get('/connections/suggestions', {
        params: { limit }
      })
    } catch (error) {
      handleApiError(error, 'getSuggestions')
    }
  },
  
  unfriend: async (friendId) => {
    try {
      if (!tokenManager.hasValidTokens()) {
        throw new Error('Please log in to manage connections')
      }
      
      return await api.delete(`/connections/friends/${friendId}`)
    } catch (error) {
      handleApiError(error, 'unfriend')
    }
  },
  
  acceptRequest: async (requestId) => {
    try {
      if (!tokenManager.hasValidTokens()) {
        throw new Error('Please log in to accept requests')
      }
      
      return await api.post(`/connections/requests/${requestId}/accept`)
    } catch (error) {
      handleApiError(error, 'acceptRequest')
    }
  },
  
  rejectRequest: async (requestId) => {
    try {
      if (!tokenManager.hasValidTokens()) {
        throw new Error('Please log in to reject requests')
      }
      
      return await api.post(`/connections/requests/${requestId}/reject`)
    } catch (error) {
      handleApiError(error, 'rejectRequest')
    }
  },
}

// Messages API
export const messagesAPI = {
  send: async (formData) => {
    try {
      if (!tokenManager.hasValidTokens()) {
        throw new Error('Please log in to send messages')
      }
      
      return await api.post('/messages/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    } catch (error) {
      handleApiError(error, 'sendMessage')
    }
  },
  
  getConversation: async (userId, skip = 0, limit = 50) => {
    try {
      if (!tokenManager.hasValidTokens()) {
        throw new Error('Please log in to view messages')
      }
      
      return await api.get(`/messages/${userId}`, {
        params: { skip, limit }
      })
    } catch (error) {
      handleApiError(error, 'getConversation')
    }
  },
  
  getConversations: async () => {
    try {
      if (!tokenManager.hasValidTokens()) {
        throw new Error('Please log in to view conversations')
      }
      
      return await api.get('/messages/')
    } catch (error) {
      handleApiError(error, 'getConversations')
    }
  },
  
  markAsRead: async (messageId) => {
    try {
      if (!tokenManager.hasValidTokens()) {
        throw new Error('Please log in to mark messages as read')
      }
      
      return await api.post(`/messages/${messageId}/read`)
    } catch (error) {
      handleApiError(error, 'markAsRead')
    }
  },
  
  deleteMessage: async (messageId) => {
    try {
      if (!tokenManager.hasValidTokens()) {
        throw new Error('Please log in to delete messages')
      }
      
      return await api.delete(`/messages/${messageId}`)
    } catch (error) {
      handleApiError(error, 'deleteMessage')
    }
  },
}

// Block API
export const blockAPI = {
  block: async (blockedId) => {
    try {
      if (!tokenManager.hasValidTokens()) {
        throw new Error('Please log in to block users')
      }
      
      return await api.post('/block', { blocked_id: blockedId })
    } catch (error) {
      handleApiError(error, 'blockUser')
    }
  },
  
  unblock: async (userId) => {
    try {
      if (!tokenManager.hasValidTokens()) {
        throw new Error('Please log in to unblock users')
      }
      
      return await api.delete(`/block/${userId}`)
    } catch (error) {
      handleApiError(error, 'unblockUser')
    }
  },
  
  getBlocked: async () => {
    try {
      if (!tokenManager.hasValidTokens()) {
        throw new Error('Please log in to view blocked users')
      }
      
      return await api.get('/block/blocked')
    } catch (error) {
      handleApiError(error, 'getBlocked')
    }
  },
  
  report: async (reportData) => {
    try {
      if (!tokenManager.hasValidTokens()) {
        throw new Error('Please log in to report content')
      }
      
      return await api.post('/block/report', reportData)
    } catch (error) {
      handleApiError(error, 'reportContent')
    }
  },
  
  checkBlocked: async (userId) => {
    try {
      if (!tokenManager.hasValidTokens()) {
        throw new Error('Please log in to check block status')
      }
      
      return await api.get(`/block/check-blocked/${userId}`)
    } catch (error) {
      handleApiError(error, 'checkBlocked')
    }
  },
}

// WebSocket API helpers
export const wsAPI = {
  getOnlineUsers: async () => {
    try {
      if (!tokenManager.hasValidTokens()) {
        throw new Error('Please log in to view online users')
      }
      
      return await api.get('/ws/online-users')
    } catch (error) {
      handleApiError(error, 'getOnlineUsers')
    }
  },
  
  getUserStatus: async (userId) => {
    try {
      if (!tokenManager.hasValidTokens()) {
        throw new Error('Please log in to check user status')
      }
      
      return await api.get(`/ws/user-status/${userId}`)
    } catch (error) {
      handleApiError(error, 'getUserStatus')
    }
  },
}

// Enhanced file upload utility
export const uploadFile = async (file, onProgress) => {
  try {
    if (!tokenManager.hasValidTokens()) {
      throw new Error('Please log in to upload files')
    }
    
    const formData = new FormData()
    formData.append('file', file)

    return await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          )
          onProgress(percentCompleted)
        }
      },
    })
  } catch (error) {
    handleApiError(error, 'uploadFile')
  }
}

// Utility functions to check authentication status
export const authUtils = {
  isAuthenticated: () => tokenManager.hasValidTokens(),
  getStoredUser: () => {
    try {
      const user = localStorage.getItem('user')
      return user ? JSON.parse(user) : null
    } catch (error) {
      console.error('Error parsing stored user:', error)
      return null
    }
  },
  clearAuth: () => tokenManager.clearTokens(),
  
  // Check if user needs to login and redirect if necessary
  requireAuth: () => {
    if (!tokenManager.hasValidTokens()) {
      redirectToLogin()
      return false
    }
    return true
  }
}

export { tokenManager }
export default api