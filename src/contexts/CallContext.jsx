import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuthStore, useCallStore } from '../store';
import { useWebRTC } from '../hooks/useWebRTC';
import { useWebSocket } from './WebSocketContext';

const CallContext = createContext();

export const useCall = () => useContext(CallContext);

export const CallProvider = ({ children }) => {
  const [callState, setCallState] = useState('idle'); // idle, dialing, receiving, connected
  const [targetUser, setTargetUser] = useState(null);
  const [callerInfo, setCallerInfo] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const { user } = useAuthStore();
  const { localStream } = useCallStore();
  const { sendMessage, addMessageHandler, removeMessageHandler } = useWebSocket();

  const {
    createOffer,
    handleReceiveOffer,
    handleReceiveAnswer,
    handleReceiveIceCandidate,
    closeConnection,
  } = useWebRTC(sendMessage);

  useEffect(() => {
    const messageHandler = (payload) => {
      switch (payload.type) {
        case 'webrtc-offer':
          setCallerInfo(payload.caller_info);
          setCallState('receiving');
          handleReceiveOffer(payload.offer, payload.from_user_id);
          break;
        case 'webrtc-answer':
          handleReceiveAnswer(payload.answer);
          setCallState('connected');
          break;
        case 'webrtc-ice-candidate':
          handleReceiveIceCandidate(payload.candidate);
          break;
        case 'call-ended':
          endCall();
          break;
        default:
          break;
      }
    };

    addMessageHandler('calls', messageHandler);

    return () => {
      removeMessageHandler('calls');
    };
  }, [addMessageHandler, removeMessageHandler, handleReceiveOffer, handleReceiveAnswer, handleReceiveIceCandidate]);

  const initiateCall = (target) => {
    setTargetUser(target);
    setCallState('dialing');
    createOffer(target.id);
  };

  const acceptCall = () => {
    setCallState('connected');
  };

  const endCall = () => {
    // Send call-ended message to the other participant
    const targetId = targetUser?.id || callerInfo?.id;
    if (targetId) {
      sendMessage({
        type: 'call-ended',
        to_user_id: targetId
      });
    }

    closeConnection();
    setCallState('idle');
    setTargetUser(null);
    setCallerInfo(null);
  };

  const toggleMute = () => {
    setIsMuted(prev => {
      const newMuted = !prev;
      // Mute/unmute local audio stream
      if (localStream) {
        localStream.getAudioTracks().forEach(track => {
          track.enabled = !newMuted;
        });
      }
      return newMuted;
    });
  };

  const value = {
    callState,
    targetUser,
    callerInfo,
    isMuted,
    initiateCall,
    acceptCall,
    endCall,
    toggleMute,
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
};
