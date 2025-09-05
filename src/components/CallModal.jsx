import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPhone, FaPhoneSlash, FaMicrophone, FaMicrophoneSlash } from 'react-icons/fa';
import { useCall } from '../contexts/CallContext';
import { useCallStore } from '../store';

const CallModal = () => {
  const { callState, callerInfo, targetUser, acceptCall, endCall, toggleMute, isMuted } = useCall();
  const { remoteStream } = useCallStore();
  const remoteAudioRef = useRef(null);

  const userToShow = callState === 'receiving' ? callerInfo : targetUser;
  const isOpen = callState !== 'idle';

  // Handle remote audio stream
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.play().catch(error => {
        console.error('Error playing remote audio:', error);
      });
    }
  }, [remoteStream]);

  return (
    <>
      {/* Hidden audio element for remote stream */}
      <audio ref={remoteAudioRef} autoPlay />
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
          >
          <motion.div
            initial={{ scale: 0.7, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.7, y: 50 }}
            className="bg-gray-800 text-white rounded-2xl p-8 w-80 flex flex-col items-center shadow-2xl"
          >
            <img
              src={userToShow?.avatar_url || 'https://via.placeholder.com/100'}
              alt={userToShow?.full_name}
              className="w-24 h-24 rounded-full border-4 border-gray-600 mb-4"
            />
            <h2 className="text-2xl font-bold">{userToShow?.full_name}</h2>
            <p className="text-gray-400 mt-1">
              {callState === 'dialing' && 'Calling...'}
              {callState === 'receiving' && 'Incoming Call...'}
              {callState === 'connected' && 'Connected'}
            </p>

            <div className="flex space-x-6 mt-8">
              {/* Call Control Buttons */}
              {callState === 'receiving' && (
                <>
                  <button
                    onClick={endCall}
                    className="bg-red-500 hover:bg-red-600 rounded-full p-4 transition-transform transform hover:scale-110"
                    aria-label="Reject Call"
                  >
                    <FaPhoneSlash size={24} />
                  </button>
                  <button
                    onClick={acceptCall}
                    className="bg-green-500 hover:bg-green-600 rounded-full p-4 transition-transform transform hover:scale-110"
                    aria-label="Accept Call"
                  >
                    <FaPhone size={24} />
                  </button>
                </>
              )}

              {callState === 'connected' && (
                <>
                  <button
                    onClick={toggleMute}
                    className="bg-gray-600 hover:bg-gray-700 rounded-full p-4 transition-transform transform hover:scale-110"
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <FaMicrophoneSlash size={24} /> : <FaMicrophone size={24} />}
                  </button>
                   <button
                    onClick={endCall}
                    className="bg-red-500 hover:bg-red-600 rounded-full p-4 transition-transform transform hover:scale-110"
                    aria-label="End Call"
                  >
                    <FaPhoneSlash size={24} />
                  </button>
                </>
              )}

              {callState === 'dialing' && (
                <button
                  onClick={endCall}
                  className="bg-red-500 hover:bg-red-600 rounded-full p-4 transition-transform transform hover:scale-110"
                  aria-label="Cancel Call"
                >
                  <FaPhoneSlash size={24} />
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
};

export default CallModal;
