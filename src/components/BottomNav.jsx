import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, MessageCircle, Users, User } from 'lucide-react'
import { motion } from 'framer-motion'

const BottomNav = () => {
  const location = useLocation()
  
  const navItems = [
    {
      path: '/feed',
      icon: Home,
      label: 'Feed',
      active: location.pathname === '/feed'
    },
    {
      path: '/chat',
      icon: MessageCircle,
      label: 'Chat',
      active: location.pathname.startsWith('/chat')
    },
    {
      path: '/connections',
      icon: Users,
      label: 'Connections',
      active: location.pathname === '/connections'
    },
    {
      path: '/profile',
      icon: User,
      label: 'Profile',
      active: location.pathname === '/profile'
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 safe-area z-50">
      <div className="flex items-center justify-around nav-height px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex-1 flex flex-col items-center justify-center py-2 relative"
            >
              {/* Active indicator */}
              {item.active && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-primary-600 rounded-full"
                  initial={false}
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 30
                  }}
                />
              )}
              
              {/* Icon */}
              <motion.div
                whilePressed={{ scale: 0.95 }}
                className={`p-1 rounded-lg transition-colors duration-200 ${
                  item.active
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                <Icon size={24} />
              </motion.div>
              
              {/* Label */}
              <span
                className={`text-xs font-medium mt-1 transition-colors duration-200 ${
                  item.active
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default BottomNav