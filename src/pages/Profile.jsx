import React, { useState } from 'react'
import { motion } from 'framer-motion'
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
      action: () => setShowEditProfile(true)
    },
    {
      icon: Bell,
      label: 'Notifications',
      action: () => console.log('Notifications')
    },
    {
      icon: Lock,
      label: 'Privacy & Security',
      action: () => navigate('/blocked')
    },
    {
      icon: theme === 'dark' ? Sun : Moon,
      label: theme === 'dark' ? 'Light Mode' : 'Dark Mode',
      action: toggleTheme
    },
    {
      icon: LogOut,
      label: 'Sign Out',
      action: handleLogout,
      danger: true
    }
  ]

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Profile
            </h1>
            <button
              onClick={() => setShowEditProfile(true)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Settings size={20} className="text-gray-500" />
            </button>
          </div>
          
          {/* Profile Info */}
          <div className="text-center">
            <div className="relative mb-4">
              {user.avatar_url ? (
                <img 
                  src={user.avatar_url} 
                  alt={user.full_name} 
                  className="w-24 h-24 rounded-full object-cover mx-auto"
                />
              ) : (
                <div className="w-24 h-24 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-white font-bold text-2xl">
                    {user.full_name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </span>
                </div>
              )}
              {showEditProfile && (
                <label className="absolute bottom-0 right-1/2 transform translate-x-1/2 translate-y-1/2 bg-primary-600 text-white p-2 rounded-full cursor-pointer">
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
                </label>
              )}
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              {user.full_name}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-3">
              @{user.username}
            </p>
            
            {user.bio && (
              <p className="text-gray-600 dark:text-gray-300 mb-4 max-w-sm mx-auto">
                {user.bio}
              </p>
            )}
            
            <div className="flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
              <span>Joined {formatJoinDate(user.created_at)}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Menu Items */}
      <div className="p-4">
        <div className="space-y-2">
          {menuItems.map((item, index) => {
            const Icon = item.icon
            return (
              <motion.button
                key={index}
                whilePressed={{ scale: 0.98 }}
                onClick={item.action}
                className={`w-full flex items-center space-x-3 p-4 rounded-lg transition-colors ${
                  item.danger
                    ? 'text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800'
                } bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </motion.button>
            )
          })}
        </div>
        
        {/* App Info */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            <span className="text-blue-900">SERO</span><span className="text-red-600">फेरो</span> v1.0.0
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
            Secure social platform for connecting with friends
          </p>

          {/* Development Notice */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mx-4">
            <div className="flex items-center justify-center mb-2">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse mr-2"></div>
              <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                Development Mode
              </span>
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
              🚀 This app was built in just 12 hours! Some features may not work perfectly yet as we're still in active development.
              We're working hard to make everything smooth and amazing for you!
            </p>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Edit Profile
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={profileData.full_name || user.full_name}
                  onChange={(e) => setProfileData({...profileData, full_name: e.target.value})}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bio
                </label>
                <textarea
                  value={profileData.bio || user.bio || ''}
                  onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                  rows={3}
                  className="input-field resize-none"
                  placeholder="Tell us about yourself..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Profile Photo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  className="block w-full text-sm text-gray-500 dark:text-gray-400"
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
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowEditProfile(false)}
                className="btn-ghost flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateProfile}
                className="btn-primary flex-1"
              >
                Save Changes
              </button>
            </div>
          </motion.div>
        </div>
      )}

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
