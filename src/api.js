import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://serofero-backend-bhuwon129903-tkqlq58c.apn.leapcell.dev'

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refresh_token')
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken
          })

          const { access_token, refresh_token: newRefreshToken } = response.data
          localStorage.setItem('access_token', access_token)
          localStorage.setItem('refresh_token', newRefreshToken)

          originalRequest.headers.Authorization = `Bearer ${access_token}`
          return api(originalRequest)
        }
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

// User API
export const userAPI = {
  uploadProfilePhoto: (file) => {
    const formData = new FormData()
    formData.append("file", file)
    return api.post("/auth/profile/photo", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    })
  }
}

// Auth API
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  logout: (refreshToken) => api.post('/auth/logout', { refresh_token: refreshToken }),
  getProfile: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
}

// Posts API
export const postsAPI = {
  create: (formData) => api.post('/posts', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  get: (postId) => api.get(`/posts/${postId}`),
  getMyPosts: (skip = 0, limit = 50) => api.get('/posts/my-posts/', {
    params: { skip, limit }
  }),
  like: (postId) => api.post(`/posts/${postId}/like`),
  addComment: (postId, data) => api.post(`/posts/${postId}/comment`, data),
  getComments: (postId, skip = 0, limit = 50) => api.get(`/posts/${postId}/comments`, {
    params: { skip, limit }
  }),
  deleteComment: (commentId) => api.delete(`/posts/comments/${commentId}`),
  deletePost: (postId) => api.delete(`/posts/${postId}`),
}

// Feed API
export const feedAPI = {
  getFeed: (page = 1, limit = 10) => api.get('/feed', {
    params: { page, limit }
  }),
  getTrending: (limit = 20) => api.get('/feed/trending', {
    params: { limit }
  }),
}

// Connections API
export const connectionsAPI = {
  sendRequest: (receiverId) => api.post('/connections/request', { receiver_id: receiverId }),
  getReceivedRequests: () => api.get('/connections/requests/received'),
  getSentRequests: () => api.get('/connections/requests/sent'),
  getFriends: () => api.get('/connections/friends'),
  getSuggestions: (limit = 10) => api.get('/connections/suggestions', {
    params: { limit }
  }),
  unfriend: (friendId) => api.delete(`/connections/friends/${friendId}`),
  acceptRequest: (requestId) => api.post(`/connections/requests/${requestId}/accept`),
  rejectRequest: (requestId) => api.post(`/connections/requests/${requestId}/reject`),
}

// Messages API
export const messagesAPI = {
  send: (formData) => api.post('/messages/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getConversation: (userId, skip = 0, limit = 50) => api.get(`/messages/${userId}`, {
    params: { skip, limit }
  }),
  getConversations: () => api.get('/messages/'),
  markAsRead: (messageId) => api.post(`/messages/${messageId}/read`),
  deleteMessage: (messageId) => api.delete(`/messages/${messageId}`),
}

// Block API
export const blockAPI = {
  block: (blockedId) => api.post('/block', { blocked_id: blockedId }),
  unblock: (userId) => api.delete(`/block/${userId}`),
  getBlocked: () => api.get('/block/blocked'),
  report: (reportData) => api.post('/block/report', reportData),
  checkBlocked: (userId) => api.get(`/block/check-blocked/${userId}`),
}

// WebSocket API helpers
export const wsAPI = {
  getOnlineUsers: () => api.get('/ws/online-users'),
  getUserStatus: (userId) => api.get(`/ws/user-status/${userId}`),
}

// File upload utility
export const uploadFile = async (file, onProgress) => {
  const formData = new FormData()
  formData.append('file', file)

  return api.post('/upload', formData, {
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
}

export default api
