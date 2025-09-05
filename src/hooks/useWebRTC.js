import { useRef, useCallback, useState } from 'react';
import { useCallStore } from '../store';
import { useAuthStore } from '../store';
import SecureWebRTC from '../utils/secureWebRTC';

export const useWebRTC = (sendMessage) => {
  const secureWebRTCRef = useRef(null);
  const [securityEvents, setSecurityEvents] = useState([]);
  const [callQuality, setCallQuality] = useState(null);
  const { user } = useAuthStore();

  // Get state and actions from your Zustand store
  const { 
    setLocalStream, 
    setRemoteStream, 
    endCall,
    setPeerConnection,
    acceptCall
  } = useCallStore.getState();

  // Initialize secure WebRTC connection
  const initializeSecureConnection = useCallback(async (isInitiator) => {
    if (secureWebRTCRef.current) {
      secureWebRTCRef.current.cleanup();
    }

    secureWebRTCRef.current = new SecureWebRTC(sendMessage, user?.id);
    
    // Set up security event handler
    secureWebRTCRef.current.onSecurityEvent = (event) => {
      setSecurityEvents(prev => [...prev.slice(-9), event]); // Keep last 10 events
      console.log('Security event:', event);
    };

    // Set up call quality monitoring
    secureWebRTCRef.current.onCallQualityUpdate = (quality) => {
      setCallQuality(quality);
    };

    const peerConnection = await secureWebRTCRef.current.initializeSecurePeerConnection(isInitiator);
    setPeerConnection(peerConnection);

    // Set up stream handlers
    peerConnection.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    // Update local stream
    setLocalStream(secureWebRTCRef.current.localStream);

    if (isInitiator) {
      peerConnection.onconnectionstatechange = () => {
        if (peerConnection.connectionState === 'connected') {
          acceptCall();
        }
      };
    }

    return peerConnection;
  }, [sendMessage, user?.id, setLocalStream, setRemoteStream, setPeerConnection, acceptCall]);

  const createOffer = async (receiverId) => {
    try {
      await initializeSecureConnection(true);
      if (secureWebRTCRef.current) {
        await secureWebRTCRef.current.createSecureOffer(receiverId);
      }
    } catch (error) {
      console.error('Failed to create secure offer:', error);
      throw error;
    }
  };

  const handleReceiveOffer = async (offerData, callerId) => {
    try {
      await initializeSecureConnection(false);
      if (secureWebRTCRef.current) {
        // Handle encrypted offer data
        const processedOfferData = {
          ...offerData,
          from_user_id: callerId
        };
        await secureWebRTCRef.current.handleSecureOffer(processedOfferData);
      }
    } catch (error) {
      console.error('Failed to handle secure offer:', error);
      throw error;
    }
  };

  const handleReceiveAnswer = async (answerData) => {
    try {
      if (secureWebRTCRef.current) {
        await secureWebRTCRef.current.handleSecureAnswer(answerData);
      }
    } catch (error) {
      console.error('Failed to handle secure answer:', error);
      throw error;
    }
  };

  const handleReceiveIceCandidate = async (candidateData) => {
    try {
      if (secureWebRTCRef.current && secureWebRTCRef.current.peerConnection) {
        // Handle encrypted candidate data if present
        let candidate = candidateData.candidate;
        
        if (candidateData.is_encrypted && candidateData.encrypted_data) {
          const decryptedData = await secureWebRTCRef.current.encryption.decryptSignalingData(
            candidateData.encrypted_data,
            candidateData.iv
          );
          candidate = decryptedData.candidate;
        }

        await secureWebRTCRef.current.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error('Error adding received ice candidate:', error);
    }
  };

  const closeConnection = () => {
    if (secureWebRTCRef.current) {
      secureWebRTCRef.current.cleanup();
      secureWebRTCRef.current = null;
    }
    
    // Reset the store
    endCall();
    
    // Clear security events
    setSecurityEvents([]);
    setCallQuality(null);
  };

  // Get current security status
  const getSecurityStatus = () => {
    if (!secureWebRTCRef.current) {
      return { level: 'none', encrypted: false, events: [] };
    }

    const hasEncryption = !!secureWebRTCRef.current.encryption.sharedSecret;
    const recentEvents = securityEvents.slice(-5);
    const hasWarnings = recentEvents.some(event => 
      ['connection_security_warning', 'suspicious_candidate', 'call_quality_degraded'].includes(event.type)
    );

    return {
      level: hasWarnings ? 'warning' : (hasEncryption ? 'high' : 'medium'),
      encrypted: hasEncryption,
      events: recentEvents,
      quality: callQuality
    };
  };

  return { 
    createOffer, 
    handleReceiveOffer, 
    handleReceiveAnswer, 
    handleReceiveIceCandidate, 
    closeConnection,
    getSecurityStatus,
    securityEvents,
    callQuality
  };
};
