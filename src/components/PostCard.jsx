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
        initial={{ opacity: 1 }}
        animate={{ opacity: 0.5 }}
        className="card p-4 mb-4 mx-4"
      >
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
          <span className="ml-2 text-gray-500">Deleting...</span>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="card p-4 mb-4 mx-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          {post.author.avatar_url ? (
            <img
              src={post.author.avatar_url}
              alt={`${post.author.full_name}'s avatar`}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {post.author.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {post.author.full_name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              @{post.author.username} · {formatTime(post.created_at)}
            </p>
          </div>
        </div>
        
        {isOwner && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <MoreVertical size={20} className="text-gray-500" />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                <button
                  onClick={handleDelete}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-red-600 dark:text-red-400"
                >
                  <Trash2 size={16} />
                  <span>Delete Post</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="mb-3">
        <p className="text-gray-900 dark:text-gray-100 leading-relaxed">
          {post.content}
        </p>
      </div>

      {/* Media */}
      {post.media_url && (
        <div className="mb-3 rounded-lg overflow-hidden">
          {post.media_type === 'image' ? (
            <img
              src={post.media_url?.includes('cloudinary.com') ? post.media_url.replace(/^\/media\//, '') : (post.media_url?.startsWith('http') ? post.media_url : `${API_URL}${post.media_url}`)}
              alt="Post media"
              className="w-full h-auto max-h-96 object-cover"
              loading="lazy"
              onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
            />
          ) : post.media_type === 'video' ? (
            <video
              src={post.media_url?.includes('cloudinary.com') ? post.media_url.replace(/^\/media\//, '') : (post.media_url?.startsWith('http') ? post.media_url : `${API_URL}${post.media_url}`)}
              controls
              preload="metadata"
              className="w-full h-auto max-h-96"
            />
          ) : (
            <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
              <a
                href={post.media_url?.includes('cloudinary.com') ? post.media_url.replace(/^\/media\//, '') : (post.media_url?.startsWith('http') ? post.media_url : `${API_URL}${post.media_url}`)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                📎 View Attachment
              </a>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
        <motion.button
          whilePressed={{ scale: 0.95 }}
          onClick={handleLike}
          className={`flex items-center space-x-2 px-3 py-2 rounded-full transition-colors ${
            isLiked
              ? 'text-red-500 bg-red-50 dark:bg-red-900/20'
              : 'hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <Heart size={18} fill={isLiked ? 'currentColor' : 'none'} />
          <span className="text-sm font-medium">{likesCount}</span>
        </motion.button>

        <motion.button
          whilePressed={{ scale: 0.95 }}
          onClick={() => {
            const toggle = !showComments
            setShowComments(toggle)
            if (toggle) fetchComments()
          }}
          className="flex items-center space-x-2 px-3 py-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <MessageCircle size={18} />
          <span className="text-sm font-medium">{post.comments_count}</span>
        </motion.button>

        <motion.button
          whilePressed={{ scale: 0.95 }}
          className="flex items-center space-x-2 px-3 py-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <Share size={18} />
        </motion.button>
      </div>

      {/* Click outside to close menu */}
      {showMenu && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => setShowMenu(false)}
        />
      )}

      {/* Image Modal */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <img
            src={post.media_url?.includes('cloudinary.com') ? post.media_url.replace(/^\/media\//, '') : (post.media_url?.startsWith('http') ? post.media_url : `${API_URL}${post.media_url}`)}
            alt="Full media"
            className="max-w-full max-h-full"
          />
          <button
            className="absolute top-4 right-4 text-white text-2xl"
            onClick={() => setShowImageModal(false)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Comments Section */}
      {showComments && (
        <div className="mt-3 border-t border-gray-200 dark:border-gray-700 pt-3">
          <div className="flex space-x-2 mb-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1 rounded-lg border px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
              placeholder="Write a comment..."
            />
            <button
              onClick={handleAddComment}
              className="bg-primary-500 text-white px-3 py-1 rounded-lg text-sm"
            >
              Send
            </button>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {comments.map(c => (
              <div key={c.id} className="flex items-start space-x-2 bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">
                {c.author.avatar_url ? (
                  <img
                    src={c.author.avatar_url}
                    alt={`${c.author.full_name}'s avatar`}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                    {c.author.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">{c.author.full_name}</span>
                    <span className="text-xs text-gray-500">{formatTime(c.created_at)}</span>
                  </div>
                  <p className="text-sm">{c.content}</p>
                </div>
                {user?.id === c.author.id && (
                  <button
                    onClick={() => handleDeleteComment(c.id)}
                    className="text-xs text-red-500 ml-2"
                  >
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
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
