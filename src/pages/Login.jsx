import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, User, Phone } from 'lucide-react'
import { useAuthStore } from '../store'

const Login = () => {
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    full_name: '',
  })
  
  const { login, register } = useAuthStore()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      if (isLogin) {
        const result = await login({
          email: formData.email,
          password: formData.password
        })
        
        if (!result.success) {
          setError(result.error)
        }
      } else {
        const result = await register(formData)
        
        if (result.success) {
          setIsLogin(true)
          setError('')
          // Optionally show success message
        } else {
          setError(result.error)
        }
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const containerVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-gray-50 via-gray-50 to-blue-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-blue-900/10">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md"
      >
        {/* Logo and title */}
        <motion.div 
          variants={itemVariants}
          className="text-center mb-10"
        >
          <div className="mb-4 flex justify-center">
            
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3 tracking-tight">
            Welcome to <span className="text-blue-900 dark:text-blue-400">SERO</span><span className="text-red-600 dark:text-red-500">फेरो</span>
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">
            Connect, share, and chat securely
          </p>
        </motion.div>

        {/* Form */}
        <motion.form
          variants={itemVariants}
          onSubmit={handleSubmit}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-gray-900/50 p-8 space-y-7 border border-gray-100 dark:border-gray-700 backdrop-blur-sm"
        >
          {/* Toggle buttons */}
          <motion.div 
            variants={itemVariants}
            className="flex bg-gray-100 dark:bg-gray-700/60 rounded-xl p-1 relative"
          >
            <motion.div
              className="absolute top-1 bottom-1 bg-white dark:bg-gray-600 rounded-lg shadow-md border border-gray-200/50 dark:border-gray-500/30"
              initial={false}
              animate={{
                left: isLogin ? "4px" : "50%",
                right: isLogin ? "50%" : "4px"
              }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
            />
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-3 text-center text-sm font-semibold rounded-lg transition-all duration-300 relative z-10 ${
                isLogin
                  ? 'text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-3 text-center text-sm font-semibold rounded-lg transition-all duration-300 relative z-10 ${
                !isLogin
                  ? 'text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              Sign Up
            </button>
          </motion.div>

          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-400 px-4 py-3.5 rounded-xl text-sm font-medium shadow-sm"
            >
              <div className="flex items-center">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-3 animate-pulse"></div>
                {error}
              </div>
            </motion.div>
          )}

          {/* Form fields */}
          <div className="space-y-5">
            {!isLogin && (
              <>
                <motion.div
                  variants={itemVariants}
                  className="space-y-2"
                >
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Full Name
                  </label>
                  <div className="relative group">
                    <User className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                    <input
                      type="text"
                      name="full_name"
                      required
                      value={formData.full_name}
                      onChange={handleInputChange}
                      className="w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 font-medium"
                      placeholder="John Doe"
                    />
                  </div>
                </motion.div>

                <motion.div
                  variants={itemVariants}
                  className="space-y-2"
                >
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Username
                  </label>
                  <div className="relative group">
                    <span className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors font-medium">@</span>
                    <input
                      type="text"
                      name="username"
                      required
                      value={formData.username}
                      onChange={handleInputChange}
                      className="w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 font-medium"
                      placeholder="johndoe"
                    />
                  </div>
                </motion.div>
              </>
            )}

            <motion.div
              variants={itemVariants}
              className="space-y-2"
            >
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Email Address
              </label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 font-medium"
                  placeholder="john@example.com"
                />
              </div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="space-y-2"
            >
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full pl-11 pr-12 py-3.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 font-medium"
                  placeholder="Enter your password"
                />
                <motion.button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </motion.button>
              </div>
            </motion.div>
          </div>

          {/* Submit button */}
          <motion.button
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3.5 px-6 rounded-xl text-base font-semibold shadow-lg shadow-blue-600/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200 flex items-center justify-center"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                <span>{isLogin ? 'Signing in...' : 'Creating account...'}</span>
              </div>
            ) : (
              <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
            )}
          </motion.button>

          {/* Additional options */}
          {isLogin && (
            <motion.div 
              variants={itemVariants}
              className="text-center"
            >
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold transition-colors"
              >
                Forgot your password?
              </motion.button>
            </motion.div>
          )}
        </motion.form>

        {/* Privacy notice */}
        <motion.div
          variants={itemVariants}
          className="text-center mt-8"
        >
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed max-w-sm mx-auto">
            By {isLogin ? 'signing in' : 'creating an account'}, you agree to our{' '}
            <button className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors">
              Terms of Service
            </button>
            {' '}and{' '}
            <button className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors">
              Privacy Policy
            </button>
            .<br />
            <span className="inline-flex items-center mt-1">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></div>
              Your data is encrypted and secure.
            </span>
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
}

export default Login