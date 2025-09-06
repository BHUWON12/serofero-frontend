import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../store';

const WebSocketContext = createContext();

export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const wsRef = useRef(null);
  const messageHandlersRef = useRef(new Map());
  const { user } = useAuthStore();

  const addMessageHandler = useCallback((key, handler) => {
    messageHandlersRef.current.set(key, handler);
  }, []);

  const removeMessageHandler = useCallback((key) => {
    messageHandlersRef.current.delete(key);
  }, []);

  const sendMessage = useCallback((message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const token = localStorage.getItem('access_token');
    if (!token) return;

    // Use a robust method to determine the WebSocket URL, with fallbacks.
    const getWebSocketUrl = () => {
      const rawBase = import.meta.env.VITE_WS_BASE_URL || import.meta.env.VITE_API_BASE_URL || window.location.host;
      let base = String(rawBase).trim();

      // Normalize scheme to ws/wss
      if (base.startsWith('http://')) {
        base = base.replace('http://', 'ws://');
      } else if (base.startsWith('https://')) {
        base = base.replace('https://', 'wss://');
      } else if (!base.startsWith('ws://') && !base.startsWith('wss://')) {
        const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
        base = protocol + base;
      }
      
      // The backend WebSocket endpoint is at /ws/:userId
      return `${base.replace(/\/$/, '')}/ws/${user.id}?token=${encodeURIComponent(token)}`;
    }
    const wsUrl = getWebSocketUrl();

    let reconnectTimeoutId = null;
    let retryCount = 0;

    const connect = () => {
      if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
        return;
      }

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("✅ WebSocket connected");
        setIsConnected(true);
        retryCount = 0;
        if (reconnectTimeoutId) clearTimeout(reconnectTimeoutId);
      };

      ws.onclose = (e) => {
        console.log(`❌ WebSocket closed.`, e);
        setIsConnected(false);
        retryCount++;
        const delay = Math.min(30000, (2 ** retryCount) * 1000);
        console.log(`Retrying in ${delay / 1000} seconds...`);

        reconnectTimeoutId = setTimeout(connect, delay);
      };

      ws.onerror = (err) => {
        console.error("⚠️ WebSocket error", err);
        // Only close if not already closing/closed
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
      };

      ws.onmessage = (event) => {
        const payload = JSON.parse(event.data);

        // Handle status updates
        if (payload.type === 'status') {
          setOnlineUsers(prev => {
            const newSet = new Set(prev);
            payload.status === 'online' ? newSet.add(payload.user_id) : newSet.delete(payload.user_id);
            return newSet;
          });
        }

        // Play notification sound for incoming messages
        if (payload.type === 'new_message' && payload.data) {
          const messageData = payload.data;
          // Only play sound for received messages (not sent by current user)
          if (messageData.sender_id !== user.id) {
            try {
              const audio = new Audio('/assets/chatmessage.mp3');
              audio.play().catch(err => {
                console.log('Audio play failed:', err);
              });
            } catch (error) {
              console.log('Audio creation failed:', error);
            }
          }
        }

        // Dispatch to registered handlers
        messageHandlersRef.current.forEach(handler => {
          handler(payload);
        });
      };
    };

    connect();

    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);

    return () => {
      clearInterval(pingInterval);
      if (reconnectTimeoutId) {
        clearTimeout(reconnectTimeoutId);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [user?.id]);

  const value = {
    isConnected,
    onlineUsers,
    sendMessage,
    addMessageHandler,
    removeMessageHandler,
  };

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
};
