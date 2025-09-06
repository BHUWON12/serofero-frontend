import React, { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Image, Video, FileText, Send, X, TrendingUp, User, Home, Sparkles, Camera, Mic, MapPin, Smile, Hash, AtSign, Eye, Heart, MessageCircle } from 'lucide-react'
import { useInView } from 'react-intersection-observer'
import { feedAPI, postsAPI } from '../api'
import { usePostsStore, useAuthStore } from '../store'
import PostCard from '../components/PostCard'

const Feed = () => {
  const [showCreatePost, setShowCreatePost] = useState(false)
  const [postContent, setPostContent] = useState('')
  const [postFile, setPostFile] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedType, setFeedType] = useState('feed') // 'feed', 'trending', or 'my-posts'
  const [dragOver, setDragOver] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  
  const { posts, isLoading, hasMore, page, setPosts, addPost, setLoading, setHasMore, setPage, reset } = usePostsStore()
  const { user } = useAuthStore()
  const fileInputRef = useRef(null)
  const textareaRef = useRef(null)
  const { ref: loadMoreRef, inView } = useInView()

  // Simplified emoji list
  const emojis = ['😊', '😂', '❤️', '👍', '😍', '🔥', '🎉', '👏', '😢', '😮', '🚀', '✨', '💯', '🙌', '🤔', '😎']

  useEffect(() => {
    loadInitialFeed()
    return () => reset()
  }, [feedType])

  useEffect(() => {
    if (inView && hasMore && !isLoading) {
      loadMorePosts()
    }
  }, [inView, hasMore, isLoading])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [postContent])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showCreatePost) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showCreatePost])

  const loadInitialFeed = async () => {
    setLoading(true)
    try {
      if (feedType === 'feed') {
        const response = await feedAPI.getFeed(1, 10)
        setPosts(response.data.posts)
        setHasMore(response.data.has_more)
        setPage(2)
      } else if (feedType === 'trending') {
        const response = await feedAPI.getTrending(20)
        setPosts(response.data)
        setHasMore(false)
      } else if (feedType === 'my-posts') {
        const response = await postsAPI.getMyPosts(0, 20)
        setPosts(response.data)
        setHasMore(false)
      }
    } catch (error) {
      console.error('Failed to load feed:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMorePosts = async () => {
    if (feedType === 'trending' || feedType === 'my-posts' || !hasMore) return
    setLoading(true)
    try {
      const response = await feedAPI.getFeed(page, 10)
      setPosts([...posts, ...response.data.posts])
      setHasMore(response.data.has_more)
      setPage(page + 1)
    } catch (error) {
      console.error('Failed to load more posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePost = async () => {
    if (!postContent.trim() && !postFile) return
    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('content', postContent)
      if (postFile) {
        formData.append('file', postFile)
      }
      const response = await postsAPI.create(formData)
      addPost(response.data)
      // Reset form
      setPostContent('')
      setPostFile(null)
      setShowCreatePost(false)
      setShowEmojiPicker(false)
    } catch (error) {
      console.error('Failed to create post:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      setPostFile(file)
    }
  }

  const insertEmoji = (emoji) => {
    const textarea = textareaRef.current
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const newValue = postContent.substring(0, start) + emoji + postContent.substring(end)
    setPostContent(newValue)
    setShowEmojiPicker(false)
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + emoji.length
      textarea.focus()
    }, 0)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      setPostFile(droppedFile)
    }
  }

  const getFeedTypeIcon = () => {
    switch (feedType) {
      case 'feed': return <Home size={16} />
      case 'trending': return <TrendingUp size={16} />
      case 'my-posts': return <User size={16} />
      default: return <Home size={16} />
    }
  }

  const getFeedStats = () => {
    if (feedType === 'feed') return `${posts.length} posts in feed`
    if (feedType === 'trending') return `${posts.length} trending posts`
    if (feedType === 'my-posts') return `${posts.length} of your posts`
    return `${posts.length} posts`
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Enhanced Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40 shadow-sm backdrop-blur-sm bg-white/95 dark:bg-gray-800/95">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-3"
            >
              <div>
                <h1 className="text-xl font-bold flex items-center">
                  <span className="text-blue-900">SERO</span>
                  <span className="text-red-600">फेरो</span>
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {getFeedStats()}
                </p>
              </div>
            </motion.div>

            {/* Enhanced Create Post Button */}
            <motion.button
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCreatePost(true)}
              className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white p-3 rounded-full shadow-lg transition-all duration-300 hover:shadow-xl"
            >
              <Plus size={20} />
            </motion.button>
          </div>

          {/* Enhanced Feed Toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1.5 shadow-inner">
            {[
              { type: 'feed', label: 'For You', icon: <Home size={14} /> },
              { type: 'trending', label: 'Trending', icon: <TrendingUp size={14} /> },
              { type: 'my-posts', label: 'My Posts', icon: <User size={14} /> }
            ].map((tab) => (
              <motion.button
                key={tab.type}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setFeedType(tab.type)}
                className={`flex-1 py-2.5 px-3 text-center text-sm font-medium rounded-lg transition-all duration-300 flex items-center justify-center space-x-2 ${
                  feedType === tab.type
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-md transform scale-105'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Enhanced Posts Feed */}
      <div className="py-6">
        {isLoading && posts.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <motion.div
              className="flex flex-col items-center space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="rounded-full h-10 w-10 border-3 border-primary-200 border-t-primary-600 shadow-lg"
              />
              <p className="text-gray-600 dark:text-gray-400 font-medium">Loading your feed...</p>
            </motion.div>
          </div>
        ) : (
          <>
            <AnimatePresence>
              {posts.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <PostCard post={post} />
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Enhanced Load more trigger */}
            {hasMore && (
              <div ref={loadMoreRef} className="flex items-center justify-center py-12">
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center space-y-3"
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="rounded-full h-8 w-8 border-2 border-primary-200 border-t-primary-600"
                    />
                    <p className="text-sm text-gray-500 dark:text-gray-400">Loading more posts...</p>
                  </motion.div>
                )}
              </div>
            )}

            {!hasMore && posts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-primary-100 to-secondary-100 dark:from-primary-900 dark:to-secondary-900 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Eye size={24} className="text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  You're all caught up!
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  You've seen all the latest posts. Check back later for more updates.
                </p>
              </motion.div>
            )}

            {posts.length === 0 && !isLoading && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="text-center py-16 mx-4"
              >
                <motion.div
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  className="w-20 h-20 bg-gradient-to-br from-primary-100 to-secondary-100 dark:from-primary-900 dark:to-secondary-900 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl"
                >
                  <Plus size={32} className="text-primary-600 dark:text-primary-400" />
                </motion.div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                  {feedType === 'my-posts' ? 'No posts yet' : 'Nothing to see here'}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                  {feedType === 'my-posts'
                    ? 'Share your first post and start building your timeline!'
                    : 'Be the first to share something amazing with the community!'
                  }
                </p>
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowCreatePost(true)}
                  className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white px-8 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-2"
                >
                  <Plus size={18} />
                  <span>Create Post</span>
                </motion.button>
              </motion.div>
            )}
          </>
        )}
      </div>

      {/* Enhanced Create Post Modal - Fixed positioning */}
      <AnimatePresence>
        {showCreatePost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
            style={{ zIndex: 9999 }}
            onClick={(e) => e.target === e.currentTarget && setShowCreatePost(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700 mx-auto my-auto"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {/* Drag overlay */}
              <AnimatePresence>
                {dragOver && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-primary-500/10 backdrop-blur-sm z-10 flex items-center justify-center border-4 border-dashed border-primary-500 rounded-2xl m-4"
                  >
                    <div className="text-center">
                      <Image size={48} className="text-primary-500 mx-auto mb-4" />
                      <p className="text-lg font-semibold text-primary-600">Drop image here</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Enhanced Header */}
              <div className="flex items-center justify-between p-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-750 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center shadow-md">
                    <Plus size={16} className="text-white" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    Create Post
                  </h2>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setShowCreatePost(false)
                    setPostContent('')
                    setPostFile(null)
                    setShowEmojiPicker(false)
                  }}
                  className="p-2 rounded-full hover:bg-white dark:hover:bg-gray-700 transition-all duration-200 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <X size={20} />
                </motion.button>
              </div>

              {/* Enhanced Content */}
              <div className="p-6 space-y-6 max-h-[50vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                {/* Enhanced User info */}
                <div className="flex items-center space-x-4">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="w-12 h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center shadow-lg ring-2 ring-white dark:ring-gray-800"
                  >
                    <span className="text-white font-bold text-sm">
                      {user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </span>
                  </motion.div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-gray-100">
                      {user?.full_name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Share with your network
                    </p>
                  </div>
                </div>

                {/* Enhanced Text input */}
                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    placeholder="What's on your mind? Share something interesting..."
                    className="w-full min-h-32 max-h-48 p-4 border border-gray-300 dark:border-gray-600 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 transition-all duration-300 text-lg leading-relaxed"
                    style={{ height: 'auto' }}
                  />
                  <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                    {postContent.length}/500
                  </div>
                </div>

                {/* Enhanced File preview */}
                <AnimatePresence>
                  {postFile && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="relative"
                    >
                      <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 p-4 rounded-xl border border-gray-200 dark:border-gray-600 shadow-inner">
                        {postFile.type.startsWith('image/') ? (
                          <div className="flex items-center space-x-4">
                            <img
                              src={URL.createObjectURL(postFile)}
                              alt="preview"
                              className="w-16 h-16 object-cover rounded-lg shadow-md"
                            />
                            <div className="flex-grow">
                              <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                                {postFile.name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {(postFile.size / 1024).toFixed(1)} KB • Image
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-4">
                            <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center shadow-md">
                              <FileText className="text-primary-600 dark:text-primary-400" size={24} />
                            </div>
                            <div className="flex-grow">
                              <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                                {postFile.name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {(postFile.size / 1024).toFixed(1)} KB • {postFile.type.split('/')[1]?.toUpperCase()}
                              </p>
                            </div>
                          </div>
                        )}
                        <motion.button
                          whileHover={{ scale: 1.1, rotate: 90 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setPostFile(null)}
                          className="absolute top-2 right-2 p-1.5 bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 text-red-600 dark:text-red-400 rounded-full transition-all duration-200"
                        >
                          <X size={14} />
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Emoji Picker */}
                <AnimatePresence>
                  {showEmojiPicker && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl border border-gray-200 dark:border-gray-600"
                    >
                      <div className="grid grid-cols-8 gap-2">
                        {emojis.map((emoji, index) => (
                          <motion.button
                            key={emoji}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.03 }}
                            whileHover={{ scale: 1.3 }}
                            whileTap={{ scale: 0.8 }}
                            onClick={() => insertEmoji(emoji)}
                            className="p-2 rounded-lg hover:bg-white dark:hover:bg-gray-600 transition-all duration-200 text-xl"
                          >
                            {emoji}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* File input (hidden) */}
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  accept="image/*,video/*,.pdf,.doc,.docx"
                  className="hidden"
                />
              </div>

              {/* Enhanced Actions */}
              <div className="p-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-750 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <motion.button
                      whileHover={{ scale: 1.1, y: -2 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => fileInputRef.current?.click()}
                      className="p-3 rounded-full hover:bg-white dark:hover:bg-gray-700 text-primary-600 hover:text-primary-700 transition-all duration-300 shadow-sm hover:shadow-md"
                      title="Add image"
                    >
                      <Image size={20} />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1, y: -2 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className={`p-3 rounded-full transition-all duration-300 shadow-sm hover:shadow-md ${
                        showEmojiPicker
                          ? 'bg-primary-100 dark:bg-primary-900 text-primary-600'
                          : 'hover:bg-white dark:hover:bg-gray-700 text-gray-500 hover:text-primary-600'
                      }`}
                      title="Add emoji"
                    >
                      <Smile size={20} />
                    </motion.button>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleCreatePost}
                    disabled={isSubmitting || (!postContent.trim() && !postFile)}
                    className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white px-8 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-2"
                  >
                    {isSubmitting ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                        />
                        <span>Posting...</span>
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        <span>Post</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Feed