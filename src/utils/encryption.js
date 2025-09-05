// End-to-end encryption utilities for secure calling
import CryptoJS from 'crypto-js';

class CallEncryption {
  constructor() {
    this.keyPair = null;
    this.sharedSecret = null;
  }

  // Generate ECDH key pair for key exchange
  async generateKeyPair() {
    try {
      this.keyPair = await window.crypto.subtle.generateKey(
        {
          name: "ECDH",
          namedCurve: "P-256"
        },
        true,
        ["deriveKey", "deriveBits"]
      );
      return this.keyPair;
    } catch (error) {
      console.error('Failed to generate key pair:', error);
      throw error;
    }
  }

  // Export public key for sharing
  async exportPublicKey() {
    if (!this.keyPair) {
      throw new Error('Key pair not generated');
    }
    
    const exported = await window.crypto.subtle.exportKey(
      "raw",
      this.keyPair.publicKey
    );
    return Array.from(new Uint8Array(exported));
  }

  // Import peer's public key and derive shared secret
  async deriveSharedSecret(peerPublicKeyArray) {
    if (!this.keyPair) {
      throw new Error('Key pair not generated');
    }

    try {
      const peerPublicKey = await window.crypto.subtle.importKey(
        "raw",
        new Uint8Array(peerPublicKeyArray),
        {
          name: "ECDH",
          namedCurve: "P-256"
        },
        false,
        []
      );

      const sharedBits = await window.crypto.subtle.deriveBits(
        {
          name: "ECDH",
          public: peerPublicKey
        },
        this.keyPair.privateKey,
        256
      );

      // Use the shared bits to create an AES key
      this.sharedSecret = await window.crypto.subtle.importKey(
        "raw",
        sharedBits,
        { name: "AES-GCM" },
        false,
        ["encrypt", "decrypt"]
      );

      return this.sharedSecret;
    } catch (error) {
      console.error('Failed to derive shared secret:', error);
      throw error;
    }
  }

  // Encrypt WebRTC signaling data
  async encryptSignalingData(data) {
    if (!this.sharedSecret) {
      throw new Error('Shared secret not established');
    }

    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(JSON.stringify(data));
      const iv = window.crypto.getRandomValues(new Uint8Array(12));

      const encrypted = await window.crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv: iv
        },
        this.sharedSecret,
        dataBuffer
      );

      return {
        encrypted: Array.from(new Uint8Array(encrypted)),
        iv: Array.from(iv)
      };
    } catch (error) {
      console.error('Failed to encrypt signaling data:', error);
      throw error;
    }
  }

  // Decrypt WebRTC signaling data
  async decryptSignalingData(encryptedData, iv) {
    if (!this.sharedSecret) {
      throw new Error('Shared secret not established');
    }

    try {
      const decrypted = await window.crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: new Uint8Array(iv)
        },
        this.sharedSecret,
        new Uint8Array(encryptedData)
      );

      const decoder = new TextDecoder();
      const decryptedString = decoder.decode(decrypted);
      return JSON.parse(decryptedString);
    } catch (error) {
      console.error('Failed to decrypt signaling data:', error);
      throw error;
    }
  }

  // Generate secure room ID for call
  generateSecureRoomId() {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Verify call integrity using HMAC
  async generateCallIntegrityHash(callData, timestamp) {
    const key = await window.crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(this.sharedSecret || 'fallback-key'),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const data = new TextEncoder().encode(JSON.stringify(callData) + timestamp);
    const signature = await window.crypto.subtle.sign("HMAC", key, data);
    return Array.from(new Uint8Array(signature));
  }

  // Verify call integrity
  async verifyCallIntegrity(callData, timestamp, expectedHash) {
    const computedHash = await this.generateCallIntegrityHash(callData, timestamp);
    return this.arrayEquals(computedHash, expectedHash);
  }

  // Helper method to compare arrays
  arrayEquals(a, b) {
    return Array.isArray(a) && Array.isArray(b) && 
           a.length === b.length && 
           a.every((val, i) => val === b[i]);
  }

  // Clean up encryption resources
  cleanup() {
    this.keyPair = null;
    this.sharedSecret = null;
  }
}

export default CallEncryption;
