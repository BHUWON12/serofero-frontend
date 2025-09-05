import React, { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Plus, Image, Video, FileText, Send, X } from 'lucide-react'
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
  
  const { posts, isLoading, hasMore, page, setPosts, addPost, setLoading, setHasMore, setPage, reset } = usePostsStore()
  const { user } = useAuthStore()
  
  const fileInputRef = useRef(null)
  const { ref: loadMoreRef, inView } = useInView()

  useEffect(() => {
    loadInitialFeed()
    return () => reset()
  }, [feedType])

  useEffect(() => {
    if (inView && hasMore && !isLoading) {
      loadMorePosts()
    }
  }, [inView, hasMore, isLoading])

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
        setHasMore(false) // For now, no pagination for my posts
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">
              <span className="text-blue-900">SERO</span><span className="text-red-600">फेरो</span>
            </h1>
            
            {/* Create Post Button */}
            <motion.button
              whilePressed={{ scale: 0.95 }}
              onClick={() => setShowCreatePost(true)}
              className="bg-primary-600 hover:bg-primary-700 text-white p-2 rounded-full shadow-lg transition-colors"
            >
              <Plus size={24} />
            </motion.button>
          </div>
          
          {/* Feed Toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mt-3">
            <button
              onClick={() => setFeedType('feed')}
              className={`flex-1 py-2 text-center text-sm font-medium rounded-md transition-colors ${
                feedType === 'feed'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              For You
            </button>
            <button
              onClick={() => setFeedType('trending')}
              className={`flex-1 py-2 text-center text-sm font-medium rounded-md transition-colors ${
                feedType === 'trending'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              Trending
            </button>
            <button
              onClick={() => setFeedType('my-posts')}
              className={`flex-1 py-2 text-center text-sm font-medium rounded-md transition-colors ${
                feedType === 'my-posts'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              My Posts
            </button>
          </div>
        </div>
      </div>

      {/* Posts Feed */}
      <div className="py-4">
        {isLoading && posts.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
            
            {/* Load more trigger */}
            {hasMore && (
              <div ref={loadMoreRef} className="flex items-center justify-center py-8">
                {isLoading && (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                )}
              </div>
            )}
            
            {!hasMore && posts.length > 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                You've caught up with all posts!
              </div>
            )}
            
            {posts.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus size={32} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  No posts yet
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Be the first to share something!
                </p>
                <button
                  onClick={() => setShowCreatePost(true)}
                  className="btn-primary"
                >
                  Create Post
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Post Modal */}
      {showCreatePost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="bg-white dark:bg-gray-800 rounded-t-2xl w-full max-w-md max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Create Post
              </h2>
              <button
                onClick={() => {
                  setShowCreatePost(false)
                  setPostContent('')
                  setPostFile(null)
                }}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-4 space-y-4">
              {/* User info */}
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    {user?.full_name}
                  </h3>
                </div>
              </div>
              
              {/* Text input */}
              <textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="What's on your mind?"
                className="w-full h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              
              {/* File preview */}
              {postFile && (
                <div className="relative">
                  <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        📎 {postFile.name}
                      </span>
                      <button
                        onClick={() => setPostFile(null)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* File input (hidden) */}
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                accept="image/*,video/*,.pdf,.doc,.docx"
                className="hidden"
              />
              
              {/* Actions */}
              <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                  >
                    <Image size={20} />
                  </button>
                </div>
                
                <button
                  onClick={handleCreatePost}
                  disabled={isSubmitting || (!postContent.trim() && !postFile)}
                  className="btn-primary px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Posting...
                    </div>
                  ) : (
                    <>
                      <Send size={16} className="mr-2" />
                      Post
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default Feed
