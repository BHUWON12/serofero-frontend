import React, { useState, useEffect } from 'react'
import { Heart, MessageCircle, Share, MoreVertical, Trash2, Send } from 'lucide-react'
import { motion } from 'framer-motion'
import { postsAPI } from '../api'
import { usePostsStore, useAuthStore } from '../store'
import ConfirmModal from './ConfirmModal'

const API_URL = import.meta.env.VITE_API_URL

const PostCard = ({ post }) => {
  const [isLiked, setIsLiked] = useState(post.is_liked)
  const [likesCount, setLikesCount] = useState(post.likes_count)
  const [showMenu, setShowMenu] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  const { updatePost, removePost } = usePostsStore()
  const { user } = useAuthStore()
  
  const [showImageModal, setShowImageModal] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState("")
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showCommentConfirmModal, setShowCommentConfirmModal] = useState(false)
  const [commentToDelete, setCommentToDelete] = useState(null)
  
  const isOwner = user?.id === post.author.id

  const fetchComments = async () => {
    try {
      const res = await postsAPI.getComments(post.id)
      setComments(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      console.error("Failed to load comments", err)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return
    try {
      const res = await postsAPI.addComment(post.id, { content: newComment })
      setComments([res.data, ...comments])
      setNewComment("")
      // also update comment count
      updatePost(post.id, { comments_count: post.comments_count + 1 })
    } catch (err) {
      console.error("Failed to add comment", err)
    }
  }

  const handleDeleteComment = (commentId) => {
    setCommentToDelete(commentId)
    setShowCommentConfirmModal(true)
  }

  const confirmDeleteComment = async () => {
    if (!commentToDelete) return

    try {
      await postsAPI.deleteComment(commentToDelete)
      setComments(comments.filter(c => c.id !== commentToDelete))
      updatePost(post.id, { comments_count: Math.max(0, post.comments_count - 1) })
      setShowCommentConfirmModal(false)
      setCommentToDelete(null)
    } catch (err) {
      console.error("Failed to delete comment", err)
      setShowCommentConfirmModal(false)
      setCommentToDelete(null)
    }
  }

  const cancelDeleteComment = () => {
    setShowCommentConfirmModal(false)
    setCommentToDelete(null)
  }

  const handleLike = async () => {
    try {
      setIsLiked(!isLiked)
      setLikesCount(isLiked ? likesCount - 1 : likesCount + 1)
      
      await postsAPI.like(post.id)
      updatePost(post.id, { 
        is_liked: !isLiked,
        likes_count: isLiked ? likesCount - 1 : likesCount + 1
      })
    } catch (error) {
      // Revert on error
      setIsLiked(isLiked)
      setLikesCount(likesCount)
      console.error('Failed to toggle like:', error)
    }
  }

  const handleDelete = () => {
    setShowConfirmModal(true)
  }

  const confirmDelete = async () => {
    setShowConfirmModal(false)
    setIsDeleting(true)
    try {
      await postsAPI.delete(post.id)
      removePost(post.id)
    } catch (error) {
      console.error('Failed to delete post:', error)
      setIsDeleting(false)
    }
  }

  const cancelDelete = () => {
    setShowConfirmModal(false)
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60))
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60))
      return diffInMinutes < 1 ? 'now' : `${diffInMinutes}m`
    } else if (diffInHours < 24) {
      return `${diffInHours}h`
    } else {
      const diffInDays = Math.floor(diffInHours / 24)
      return `${diffInDays}d`
    }
  }

  if (isDeleting) {
    return (
      <motion.div
        initial={{ opacity: 1, scale: 1 }}
        animate={{ opacity: 0.3, scale: 0.95 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="card p-6 mb-6 mx-4 backdrop-blur-sm"
      >
        <div className="flex items-center justify-center py-12">
          <div className="relative">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-primary-600"></div>
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary-400 animate-pulse"></div>
          </div>
          <span className="ml-4 text-gray-600 dark:text-gray-400 font-medium">Deleting post...</span>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -30, scale: 0.95 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="card p-6 mb-6 mx-4 relative overflow-hidden backdrop-blur-sm border border-gray-100 dark:border-gray-800 hover:shadow-lg transition-all duration-300"
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent dark:from-gray-900/20 pointer-events-none"></div>
      
      {/* Content wrapper */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-4 flex-1 min-w-0">
            <div className="relative shrink-0">
              {post.author.avatar_url ? (
                <img
                  src={post.author.avatar_url}
                  alt={`${post.author.full_name}'s avatar`}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-white dark:ring-gray-800 shadow-md"
                />
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-gray-800 shadow-md">
                  <span className="text-white font-bold text-base">
                    {post.author.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </span>
                </div>
              )}
              {/* Online indicator - subtle enhancement */}
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 border-2 border-white dark:border-gray-800 rounded-full"></div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2 mb-0.5">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base truncate">
                  {post.author.full_name}
                </h3>
                {/* Verification badge - subtle enhancement */}
                <div className="w-4 h-4 bg-primary-500 rounded-full flex items-center justify-center shrink-0">
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400">
                <span className="truncate">@{post.author.username}</span>
                <span className="shrink-0">·</span>
                <time className="shrink-0 font-medium">{formatTime(post.created_at)}</time>
              </div>
            </div>
          </div>
          
          {isOwner && (
            <div className="relative shrink-0 ml-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowMenu(!showMenu)}
                className="p-2.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all duration-200 backdrop-blur-sm"
              >
                <MoreVertical size={18} className="text-gray-500 dark:text-gray-400" />
              </motion.button>
              
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-52 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-20 overflow-hidden backdrop-blur-md"
                >
                  <div className="py-2">
                    <button
                      onClick={handleDelete}
                      className="flex items-center space-x-3 w-full px-4 py-3 text-left hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors duration-200"
                    >
                      <Trash2 size={18} />
                      <span className="font-medium">Delete Post</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="mb-4">
          <p className="text-gray-900 dark:text-gray-100 leading-relaxed text-base break-words">
            {post.content}
          </p>
        </div>

        {/* Media */}
        {post.media_url && (
          <div className="mb-4 rounded-xl overflow-hidden border border-gray-200/50 dark:border-gray-700/50">
            {post.media_type === 'image' ? (
              <motion.img
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
                src={post.media_url?.includes('cloudinary.com') ? post.media_url.replace(/^\/media\//, '') : (post.media_url?.startsWith('http') ? post.media_url : `${API_URL}${post.media_url}`)}
                alt="Post media"
                className="w-full h-auto max-h-[400px] object-cover cursor-pointer"
                loading="lazy"
                onClick={() => setShowImageModal(true)}
              />
            ) : post.media_type === 'video' ? (
              <video
                src={post.media_url?.includes('cloudinary.com') ? post.media_url.replace(/^\/media\//, '') : (post.media_url?.startsWith('http') ? post.media_url : `${API_URL}${post.media_url}`)}
                controls
                preload="metadata"
                className="w-full h-auto max-h-[400px] bg-black"
              />
            ) : (
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-600">
                <a
                  href={post.media_url?.includes('cloudinary.com') ? post.media_url.replace(/^\/media\//, '') : (post.media_url?.startsWith('http') ? post.media_url : `${API_URL}${post.media_url}`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-3 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium transition-colors duration-200"
                >
                  <span className="text-2xl">📎</span>
                  <span>View Attachment</span>
                </a>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLike}
            className={`flex items-center space-x-3 px-4 py-2.5 rounded-full transition-all duration-200 font-medium ${
              isLiked
                ? 'text-red-500 bg-red-50 dark:bg-red-900/20 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Heart size={20} fill={isLiked ? 'currentColor' : 'none'} className="transition-all duration-200" />
            <span className="text-sm tabular-nums">{likesCount}</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              const toggle = !showComments
              setShowComments(toggle)
              if (toggle) fetchComments()
            }}
            className={`flex items-center space-x-3 px-4 py-2.5 rounded-full transition-all duration-200 font-medium ${
              showComments
                ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/20 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <MessageCircle size={20} />
            <span className="text-sm tabular-nums">{post.comments_count}</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center space-x-3 px-4 py-2.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-all duration-200 font-medium"
          >
            <Share size={20} />
            <span className="text-sm">Share</span>
          </motion.button>
        </div>

        {/* Comments Section */}
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
          >
            {/* Comment input */}
            <div className="flex items-start space-x-3 mb-4">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt="Your avatar"
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-white dark:ring-gray-800 shadow-sm shrink-0"
                />
              ) : (
                <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-gray-800 shadow-sm shrink-0">
                  <span className="text-white font-semibold text-xs">
                    {user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1 flex space-x-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                  className="flex-1 rounded-full border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200"
                  placeholder="Write a comment..."
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  className="bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 flex items-center space-x-2 shadow-sm"
                >
                  <Send size={16} />
                  <span>Send</span>
                </motion.button>
              </div>
            </div>

            {/* Comments list */}
            <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
              {comments.map((c, index) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start space-x-3 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm"
                >
                  {c.author.avatar_url ? (
                    <img
                      src={c.author.avatar_url}
                      alt={`${c.author.full_name}'s avatar`}
                      className="w-8 h-8 rounded-full object-cover ring-2 ring-white dark:ring-gray-800 shadow-sm shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center text-white text-xs font-semibold ring-2 ring-white dark:ring-gray-800 shadow-sm shrink-0">
                      {c.author.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
                          {c.author.full_name}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                          {formatTime(c.created_at)}
                        </span>
                      </div>
                      {user?.id === c.author.id && (
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleDeleteComment(c.id)}
                          className="text-xs text-red-500 hover:text-red-600 font-medium px-2 py-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 shrink-0"
                        >
                          Delete
                        </motion.button>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 break-words leading-relaxed">
                      {c.content}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Click outside to close menu */}
      {showMenu && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowMenu(false)}
        />
      )}

      {/* Enhanced Image Modal */}
      {showImageModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 backdrop-blur-sm"
          onClick={() => setShowImageModal(false)}
        >
          <motion.img
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", duration: 0.5 }}
            src={post.media_url?.includes('cloudinary.com') ? post.media_url.replace(/^\/media\//, '') : (post.media_url?.startsWith('http') ? post.media_url : `${API_URL}${post.media_url}`)}
            alt="Full media"
            className="max-w-[90%] max-h-[90%] object-contain shadow-2xl rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <motion.button
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            className="absolute top-6 right-6 w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white text-2xl font-light hover:bg-white/30 transition-all duration-200"
            onClick={() => setShowImageModal(false)}
          >
            ✕
          </motion.button>
        </motion.div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        title="Delete Post"
        message="Are you sure you want to delete this post? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        type="danger"
      />

      {/* Confirm Delete Comment Modal */}
      <ConfirmModal
        isOpen={showCommentConfirmModal}
        title="Delete Comment"
        message="Are you sure you want to delete this comment? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteComment}
        onCancel={cancelDeleteComment}
        type="danger"
      />
    </motion.div>
  )
}

export default PostCard