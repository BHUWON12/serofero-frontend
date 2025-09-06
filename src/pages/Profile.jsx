import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings, Shield, Moon, Sun, LogOut, Edit3, Camera, Bell, Lock } from 'lucide-react'
import { useAuthStore, useUIStore } from '../store'
import { useNavigate } from 'react-router-dom'
import ConfirmModal from '../components/ConfirmModal'

const Profile = () => {
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [profileData, setProfileData] = useState({
    full_name: '',
    bio: '',
    avatar_url: ''
  })
  
  const { user, logout, updateProfile } = useAuthStore()
  const { theme, toggleTheme } = useUIStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    setShowLogoutModal(true)
  }

  const confirmLogout = async () => {
    setShowLogoutModal(false)
    await logout()
    navigate('/login')
  }

  const cancelLogout = () => {
    setShowLogoutModal(false)
  }

  const handleUpdateProfile = async () => {
    try {
      // In a real app, you'd make an API call here
      updateProfile(profileData)
      setShowEditProfile(false)
    } catch (error) {
      console.error('Failed to update profile:', error)
    }
  }

  const formatJoinDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    })
  }

  const menuItems = [
    {
      icon: Edit3,
      label: 'Edit Profile',
      action: () => setShowEditProfile(true),
      description: 'Update your personal information'
    },
    {
      icon: Bell,
      label: 'Notifications',
      action: () => console.log('Notifications'),
      description: 'Manage your notification preferences'
    },
    {
      icon: Lock,
      label: 'Privacy & Security',
      action: () => navigate('/blocked'),
      description: 'Control your privacy settings'
    },
    {
      icon: theme === 'dark' ? Sun : Moon,
      label: theme === 'dark' ? 'Light Mode' : 'Dark Mode',
      action: toggleTheme,
      description: `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`
    },
    {
      icon: LogOut,
      label: 'Sign Out',
      action: handleLogout,
      danger: true,
      description: 'Sign out of your account'
    }
  ]

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="rounded-full h-10 w-10 border-3 border-primary-200 border-t-primary-600"
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Enhanced Header with Gradient Background */}
      <div className="bg-gradient-to-r from-white via-white to-gray-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-700 border-b border-gray-200 dark:border-gray-600 shadow-sm">
        <div className="px-6 py-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-between mb-8"
          >
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
              Profile
            </h1>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowEditProfile(true)}
              className="p-3 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 shadow-sm"
            >
              <Settings size={20} className="text-gray-600 dark:text-gray-300" />
            </motion.button>
          </motion.div>
          
          {/* Enhanced Profile Info */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center"
          >
            <div className="relative mb-6 inline-block">
              {user.avatar_url ? (
                <motion.img 
                  whileHover={{ scale: 1.05 }}
                  src={user.avatar_url} 
                  alt={user.full_name} 
                  className="w-28 h-28 rounded-2xl object-cover shadow-lg ring-4 ring-white dark:ring-gray-700"
                />
              ) : (
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  className="w-28 h-28 bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-500 rounded-2xl flex items-center justify-center shadow-lg ring-4 ring-white dark:ring-gray-700"
                >
                  <span className="text-white font-bold text-3xl tracking-wide">
                    {user.full_name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </span>
                </motion.div>
              )}
              
              <AnimatePresence>
                {showEditProfile && (
                  <motion.label
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="absolute -bottom-2 -right-2 bg-primary-600 hover:bg-primary-700 text-white p-3 rounded-xl cursor-pointer shadow-lg transition-all duration-200"
                  >
                    <Camera size={16} />
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={async (e) => {
                        if (e.target.files[0]) {
                          const file = e.target.files[0];
                          const formData = new FormData();
                          formData.append("file", file);
                          try {
                            const { userAPI } = await import("../api");
                            const res = await userAPI.uploadProfilePhoto(file);
                            updateProfile({ ...user, avatar_url: res.data.avatar_url });
                            const { authAPI } = await import("../api");
                            const refreshed = await authAPI.getProfile();
                            updateProfile(refreshed.data);
                          } catch (err) {
                            console.error("Failed to upload profile photo", err);
                          }
                        }
                      }}
                    />
                  </motion.label>
                )}
              </AnimatePresence>
            </div>
            
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2 tracking-tight"
            >
              {user.full_name}
            </motion.h2>
            
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-lg text-gray-500 dark:text-gray-400 mb-4 font-medium"
            >
              @{user.username}
            </motion.p>
            
            {user.bio && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-gray-600 dark:text-gray-300 mb-6 max-w-md mx-auto text-base leading-relaxed"
              >
                {user.bio}
              </motion.p>
            )}
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="inline-flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-full text-sm text-gray-600 dark:text-gray-300"
            >
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              <span>Joined {formatJoinDate(user.created_at)}</span>
            </motion.div>
          </motion.div>
        </div>
      </div>
      
      {/* Enhanced Menu Items */}
      <div className="p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="space-y-3"
        >
          {menuItems.map((item, index) => {
            const Icon = item.icon
            return (
              <motion.button
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
                onClick={item.action}
                className={`group w-full flex items-center justify-between p-5 rounded-2xl transition-all duration-300 shadow-sm hover:shadow-md ${
                  item.danger
                    ? 'text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20 bg-white dark:bg-gray-800 border border-error-200 dark:border-error-800/50'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-xl transition-all duration-300 ${
                    item.danger 
                      ? 'bg-error-100 dark:bg-error-900/30 group-hover:bg-error-200 dark:group-hover:bg-error-900/50'
                      : 'bg-gray-200 dark:bg-gray-700 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30'
                  }`}>
                    <Icon size={20} className={`transition-all duration-300 ${
                      item.danger 
                        ? 'text-error-600 dark:text-error-400'
                        : 'text-gray-600 dark:text-gray-300 group-hover:text-primary-600 dark:group-hover:text-primary-400'
                    }`} />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-base">{item.label}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {item.description}
                    </div>
                  </div>
                </div>
                <motion.div
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  whileHover={{ x: 2 }}
                >
                  <div className="w-2 h-2 bg-current rounded-full"></div>
                </motion.div>
              </motion.button>
            )
          })}
        </motion.div>
        
        {/* Enhanced App Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="mt-10 text-center"
        >
          <div className="bg-gradient-to-r from-white via-gray-50 to-white dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="inline-block mb-3"
            >
              <p className="text-lg font-bold tracking-wide">
                <span className="text-blue-900 dark:text-blue-400">SERO</span>
                <span className="text-red-600 dark:text-red-500">फेरो</span>
                <span className="text-gray-500 dark:text-gray-400 text-sm ml-2">v1.0.0</span>
              </p>
            </motion.div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
              Secure social platform for connecting with friends
            </p>

            {/* Enhanced Development Notice */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 dark:from-amber-900/20 dark:via-orange-900/30 dark:to-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-5 shadow-sm"
            >
              <div className="flex items-center justify-center mb-3">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-2.5 h-2.5 bg-amber-500 rounded-full mr-3"
                />
                <span className="text-sm font-semibold text-amber-700 dark:text-amber-300 tracking-wide">
                  Development Mode
                </span>
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
                🚀 This app was built in just 12 hours! Some features may not work perfectly yet as we're still in active development.
                We're working hard to make everything smooth and amazing for you!
              </p>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Enhanced Edit Profile Modal */}
      <AnimatePresence>
        {showEditProfile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-8 shadow-2xl border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Edit Profile
                </h3>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowEditProfile(false)}
                  className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <Edit3 size={18} className="text-gray-500 dark:text-gray-400" />
                </motion.button>
              </div>
              
              <div className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profileData.full_name || user.full_name}
                    onChange={(e) => setProfileData({...profileData, full_name: e.target.value})}
                    className="input-field rounded-xl border-2 focus:border-primary-500 transition-all duration-200"
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Bio
                  </label>
                  <textarea
                    value={profileData.bio || user.bio || ''}
                    onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                    rows={4}
                    className="input-field resize-none rounded-xl border-2 focus:border-primary-500 transition-all duration-200"
                    placeholder="Tell us about yourself..."
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Profile Photo
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-3 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 file:cursor-pointer cursor-pointer transition-all duration-200"
                      onChange={async (e) => {
                        if (e.target.files[0]) {
                          const file = e.target.files[0];
                          const formData = new FormData();
                          formData.append("file", file);
                          try {
                            const { userAPI } = await import("../api");
                            const res = await userAPI.uploadProfilePhoto(file);
                            updateProfile({ ...user, avatar_url: res.data.avatar_url });
                            const { authAPI } = await import("../api");
                            const refreshed = await authAPI.getProfile();
                            updateProfile(refreshed.data);
                          } catch (err) {
                            console.error("Failed to upload profile photo", err);
                          }
                        }
                      }}
                    />
                  </div>
                </motion.div>
              </div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex space-x-4 mt-8"
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowEditProfile(false)}
                  className="btn-ghost flex-1 rounded-xl py-3 font-semibold"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleUpdateProfile}
                  className="btn-primary flex-1 rounded-xl py-3 font-semibold shadow-lg"
                >
                  Save Changes
                </motion.button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Logout Confirm Modal */}
      <ConfirmModal
        isOpen={showLogoutModal}
        title="Sign Out"
        message="Are you sure you want to sign out of your account?"
        confirmText="Sign Out"
        cancelText="Cancel"
        onConfirm={confirmLogout}
        onCancel={cancelLogout}
        type="warning"
      />
    </div>
  )
}

export default Profile