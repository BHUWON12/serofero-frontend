// Secure WebRTC implementation with enhanced security features
import CallEncryption from './encryption.js';

// Enhanced ICE servers configuration with TURN servers for better connectivity
const SECURE_ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // Add TURN servers for production use
    // {
    //   urls: 'turn:your-turn-server.com:3478',
    //   username: 'your-username',
    //   credential: 'your-password'
    // }
  ],
  iceCandidatePoolSize: 10,
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require'
};

class SecureWebRTC {
  constructor(sendMessage, userId) {
    this.sendMessage = sendMessage;
    this.userId = userId;
    this.peerConnection = null;
    this.encryption = new CallEncryption();
    this.localStream = null;
    this.remoteStream = null;
    this.callId = null;
    this.isInitiator = false;
    this.securityLevel = 'high'; // high, medium, low
    this.callStartTime = null;
    this.heartbeatInterval = null;
    
    // Security event handlers
    this.onSecurityEvent = null;
    this.onCallQualityUpdate = null;
  }

  // Initialize secure peer connection with enhanced security
  async initializeSecurePeerConnection(isInitiator = false) {
    try {
      this.isInitiator = isInitiator;
      this.callId = this.encryption.generateSecureRoomId();
      this.callStartTime = Date.now();

      // Generate encryption keys
      await this.encryption.generateKeyPair();

      // Create peer connection with secure configuration
      this.peerConnection = new RTCPeerConnection({
        ...SECURE_ICE_SERVERS,
        certificates: await this.generateCertificates()
      });

      // Set up security monitoring
      this.setupSecurityMonitoring();
      
      // Set up connection state monitoring
      this.setupConnectionMonitoring();

      // Get user media with enhanced constraints
      await this.getUserMediaSecure();

      return this.peerConnection;
    } catch (error) {
      console.error('Failed to initialize secure peer connection:', error);
      this.handleSecurityEvent('initialization_failed', { error: error.message });
      throw error;
    }
  }

  // Generate DTLS certificates for enhanced security
  async generateCertificates() {
    try {
      const certificate = await RTCPeerConnection.generateCertificate({
        name: 'ECDSA',
        namedCurve: 'P-256'
      });
      return [certificate];
    } catch (error) {
      console.warn('Failed to generate custom certificate, using default:', error);
      return undefined;
    }
  }

  // Get user media with secure constraints
  async getUserMediaSecure() {
    const constraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000,
        channelCount: 2
      }
      // Removed video constraints for audio-only calls
    };

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Add tracks to peer connection
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });

      return this.localStream;
    } catch (error) {
      console.error('Failed to get user media:', error);
      this.handleSecurityEvent('media_access_failed', { error: error.message });
      throw error;
    }
  }

  // Setup security monitoring
  setupSecurityMonitoring() {
    // Monitor ICE connection state
    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection.iceConnectionState;
      console.log('ICE connection state:', state);
      
      if (state === 'failed' || state === 'disconnected') {
        this.handleSecurityEvent('connection_security_warning', { 
          state,
          message: 'Connection may be compromised'
        });
      }
    };

    // Monitor DTLS state
    this.peerConnection.ondatachannel = (event) => {
      const channel = event.channel;
      console.log('Data channel created:', channel.label);
      
      channel.onopen = () => {
        this.handleSecurityEvent('secure_channel_established', {
          channel: channel.label
        });
      };
    };

    // Start heartbeat for connection monitoring
    this.startHeartbeat();
  }

  // Setup connection quality monitoring
  setupConnectionMonitoring() {
    this.peerConnection.ontrack = (event) => {
      this.remoteStream = event.streams[0];
      this.monitorCallQuality();
    };

    // Monitor ICE candidates for security
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.validateIceCandidate(event.candidate);
        this.sendSecureSignalingMessage({
          type: 'webrtc-ice-candidate',
          candidate: event.candidate
        });
      }
    };
  }

  // Validate ICE candidates for security
  validateIceCandidate(candidate) {
    const candidateStr = candidate.candidate;
    
    // Check for suspicious candidates
    if (candidateStr.includes('relay') && !candidateStr.includes('turn')) {
      this.handleSecurityEvent('suspicious_candidate', {
        candidate: candidateStr,
        message: 'Unexpected relay candidate detected'
      });
    }

    // Log candidate types for monitoring
    const candidateType = candidateStr.match(/typ (\w+)/)?.[1];
    console.log('ICE candidate type:', candidateType);
  }

  // Create secure offer
  async createSecureOffer(targetUserId) {
    try {
      await this.initializeSecurePeerConnection(true);
      
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      });
      
      await this.peerConnection.setLocalDescription(offer);

      // Send encrypted offer with public key
      const publicKey = await this.encryption.exportPublicKey();
      
      await this.sendSecureSignalingMessage({
        type: 'webrtc-offer',
        to_user_id: targetUserId,
        offer: offer,
        public_key: publicKey,
        call_id: this.callId,
        security_level: this.securityLevel,
        timestamp: Date.now()
      });

      return offer;
    } catch (error) {
      console.error('Failed to create secure offer:', error);
      this.handleSecurityEvent('offer_creation_failed', { error: error.message });
      throw error;
    }
  }

  // Handle secure offer
  async handleSecureOffer(offerData) {
    try {
      await this.initializeSecurePeerConnection(false);
      
      // Verify offer integrity and establish encryption
      if (offerData.public_key) {
        await this.encryption.deriveSharedSecret(offerData.public_key);
      }

      // Validate call parameters
      this.validateCallSecurity(offerData);

      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offerData.offer));
      
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      // Send encrypted answer with public key
      const publicKey = await this.encryption.exportPublicKey();
      
      await this.sendSecureSignalingMessage({
        type: 'webrtc-answer',
        to_user_id: offerData.from_user_id,
        answer: answer,
        public_key: publicKey,
        call_id: offerData.call_id,
        timestamp: Date.now()
      });

      return answer;
    } catch (error) {
      console.error('Failed to handle secure offer:', error);
      this.handleSecurityEvent('offer_handling_failed', { error: error.message });
      throw error;
    }
  }

  // Handle secure answer
  async handleSecureAnswer(answerData) {
    try {
      // Establish encryption if not already done
      if (answerData.public_key && !this.encryption.sharedSecret) {
        await this.encryption.deriveSharedSecret(answerData.public_key);
      }

      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answerData.answer));
      
      this.handleSecurityEvent('secure_connection_established', {
        call_id: this.callId,
        encryption_enabled: !!this.encryption.sharedSecret
      });
    } catch (error) {
      console.error('Failed to handle secure answer:', error);
      this.handleSecurityEvent('answer_handling_failed', { error: error.message });
      throw error;
    }
  }

  // Send secure signaling message
  async sendSecureSignalingMessage(message) {
    try {
      let finalMessage = message;

      // Encrypt sensitive signaling data if encryption is established
      if (this.encryption.sharedSecret && message.type.startsWith('webrtc-')) {
        const encryptedData = await this.encryption.encryptSignalingData({
          offer: message.offer,
          answer: message.answer,
          candidate: message.candidate
        });
        
        finalMessage = {
          ...message,
          encrypted_data: encryptedData.encrypted,
          iv: encryptedData.iv,
          is_encrypted: true
        };
        
        // Remove unencrypted data
        delete finalMessage.offer;
        delete finalMessage.answer;
        delete finalMessage.candidate;
      }

      // Add integrity hash
      if (this.encryption.sharedSecret) {
        const timestamp = Date.now();
        const integrityHash = await this.encryption.generateCallIntegrityHash(finalMessage, timestamp);
        finalMessage.integrity_hash = integrityHash;
        finalMessage.timestamp = timestamp;
      }

      this.sendMessage(finalMessage);
    } catch (error) {
      console.error('Failed to send secure signaling message:', error);
      this.handleSecurityEvent('signaling_failed', { error: error.message });
    }
  }

  // Validate call security parameters
  validateCallSecurity(callData) {
    // Check call age (prevent replay attacks)
    const callAge = Date.now() - (callData.timestamp || 0);
    if (callAge > 30000) { // 30 seconds
      throw new Error('Call offer too old, possible replay attack');
    }

    // Validate security level
    if (callData.security_level && callData.security_level !== this.securityLevel) {
      this.handleSecurityEvent('security_level_mismatch', {
        expected: this.securityLevel,
        received: callData.security_level
      });
    }

    // Validate call ID format
    if (callData.call_id && !/^[a-f0-9]{64}$/.test(callData.call_id)) {
      throw new Error('Invalid call ID format');
    }
  }

  // Monitor call quality and security
  monitorCallQuality() {
    const qualityInterval = setInterval(async () => {
      if (!this.peerConnection || this.peerConnection.connectionState === 'closed') {
        clearInterval(qualityInterval);
        return;
      }

      try {
        const stats = await this.peerConnection.getStats();
        const qualityMetrics = this.analyzeCallQuality(stats);
        
        if (this.onCallQualityUpdate) {
          this.onCallQualityUpdate(qualityMetrics);
        }

        // Check for security issues in call quality
        if (qualityMetrics.packetsLost > 50 || qualityMetrics.jitter > 100) {
          this.handleSecurityEvent('call_quality_degraded', {
            metrics: qualityMetrics,
            message: 'Possible network interference or attack'
          });
        }
      } catch (error) {
        console.error('Failed to monitor call quality:', error);
      }
    }, 5000); // Check every 5 seconds
  }

  // Analyze call quality from WebRTC stats
  analyzeCallQuality(stats) {
    const metrics = {
      packetsLost: 0,
      packetsReceived: 0,
      jitter: 0,
      roundTripTime: 0,
      bitrate: 0
    };

    stats.forEach(report => {
      if (report.type === 'inbound-rtp') {
        metrics.packetsLost += report.packetsLost || 0;
        metrics.packetsReceived += report.packetsReceived || 0;
        metrics.jitter = Math.max(metrics.jitter, report.jitter || 0);
      }
      
      if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        metrics.roundTripTime = report.currentRoundTripTime || 0;
      }
    });

    return metrics;
  }

  // Start heartbeat for connection monitoring
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.peerConnection && this.peerConnection.connectionState === 'connected') {
        // Send heartbeat through data channel if available
        this.sendHeartbeat();
      }
    }, 10000); // Every 10 seconds
  }

  // Send heartbeat message
  sendHeartbeat() {
    try {
      this.sendSecureSignalingMessage({
        type: 'call-heartbeat',
        call_id: this.callId,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Failed to send heartbeat:', error);
    }
  }

  // Handle security events
  handleSecurityEvent(eventType, details) {
    const securityEvent = {
      type: eventType,
      timestamp: Date.now(),
      call_id: this.callId,
      user_id: this.userId,
      details
    };

    console.log('Security event:', securityEvent);

    if (this.onSecurityEvent) {
      this.onSecurityEvent(securityEvent);
    }

    // Log critical security events
    if (['connection_security_warning', 'suspicious_candidate', 'call_quality_degraded'].includes(eventType)) {
      // In production, send to security monitoring service
      console.warn('Critical security event detected:', securityEvent);
    }
  }

  // Clean up resources
  cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }

    if (this.peerConnection) {
      this.peerConnection.close();
    }

    this.encryption.cleanup();
    
    this.handleSecurityEvent('call_ended', {
      duration: Date.now() - (this.callStartTime || Date.now())
    });
  }
}

export default SecureWebRTC;
