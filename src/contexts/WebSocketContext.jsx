import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuthStore } from '../store';

const WebSocketContext = createContext();

export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const messageHandlersRef = useRef(new Map());
  const { user } = useAuthStore();

  // Preload audio
  const audioRef = useRef(new Audio('/assets/chatmessage.mp3'));

  const addMessageHandler = useCallback((key, handler) => {
    messageHandlersRef.current.set(key, handler);
  }, []);

  const removeMessageHandler = useCallback((key) => {
    messageHandlersRef.current.delete(key);
  }, []);

  const sendMessage = useCallback((message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const token = localStorage.getItem('access_token');
    if (!token) return;

    // Generate WebSocket URL dynamically
    const getWebSocketUrl = () => {
      let base = import.meta.env.VITE_WS_BASE_URL || import.meta.env.VITE_API_BASE_URL || window.location.host;
      base = String(base).trim();

      if (base.startsWith('http://')) base = base.replace('http://', 'ws://');
      else if (base.startsWith('https://')) base = base.replace('https://', 'wss://');
      else if (!base.startsWith('ws://') && !base.startsWith('wss://')) {
        base = (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + base;
      }

      return `${base.replace(/\/$/, '')}/ws/${user.id}?token=${encodeURIComponent(token)}`;
    };

    const wsUrl = getWebSocketUrl();
    let retryCount = 0;

    const connect = () => {
      if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) return;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setIsConnected(true);
        retryCount = 0;
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      };

      ws.onclose = (e) => {
        console.log('❌ WebSocket closed.', e);
        setIsConnected(false);
        retryCount++;
        const delay = Math.min(30000, 2 ** retryCount * 1000);
        console.log(`Retrying in ${delay / 1000} seconds...`);
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      };

      ws.onerror = (err) => {
        console.error('⚠️ WebSocket error', err);
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) ws.close();
      };

      ws.onmessage = (event) => {
        let payload;
        try {
          payload = JSON.parse(event.data);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
          return;
        }

        if (payload.type === 'status') {
          setOnlineUsers(prev => {
            const newSet = new Set(prev);
            payload.status === 'online' ? newSet.add(payload.user_id) : newSet.delete(payload.user_id);
            return newSet;
          });
        }

        if (payload.type === 'new_message' && payload.data && payload.data.sender_id !== user.id) {
          audioRef.current.play().catch(err => console.log('Audio play failed:', err));
        }

        messageHandlersRef.current.forEach(handler => handler(payload));
      };
    };

    connect();

    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    // Cleanup on unmount or logout
    return () => {
      clearInterval(pingInterval);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [user?.id]);

  const value = useMemo(() => ({
    isConnected,
    onlineUsers,
    sendMessage,
    addMessageHandler,
    removeMessageHandler,
  }), [isConnected, onlineUsers, sendMessage, addMessageHandler, removeMessageHandler]);

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
};
