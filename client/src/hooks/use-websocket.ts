import { useState, useEffect, useRef, useCallback } from 'react';

interface WebSocketMessage {
  type: string;
  content?: string;
  timestamp?: string;
  [key: string]: any;
}

interface UseWebSocketReturn {
  lastMessage: WebSocketMessage | null;
  readyState: number;
  sendMessage: (message: WebSocketMessage) => void;
  sendJsonMessage: (message: any) => void;
}

export function useWebSocket(url: string): UseWebSocketReturn {
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [readyState, setReadyState] = useState<number>(WebSocket.CONNECTING);
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeouts = useRef<NodeJS.Timeout[]>([]);
  const reconnectAttempts = useRef<number>(0);
  const maxReconnectAttempts = 5;
  const isManualClose = useRef<boolean>(false);

  const connect = useCallback(() => {
    // Don't attempt to connect if we've exceeded max attempts
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      console.warn('Max WebSocket reconnection attempts reached');
      return;
    }

    try {
      // Clean up existing connection if any
      if (ws.current && ws.current.readyState !== WebSocket.CLOSED) {
        ws.current.close();
      }

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      setReadyState(WebSocket.CONNECTING);
      ws.current = new WebSocket(wsUrl);
      
      ws.current.onopen = () => {
        setReadyState(WebSocket.OPEN);
        reconnectAttempts.current = 0; // Reset counter on successful connection
        console.log('WebSocket connected');
      };
      
      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          setLastMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      ws.current.onclose = (event) => {
        setReadyState(WebSocket.CLOSED);
        console.log('WebSocket disconnected', event.code, event.reason);
        
        // Only reconnect if:
        // 1. It wasn't a manual close
        // 2. It wasn't a normal close (1000) or going away (1001)
        // 3. We haven't exceeded max attempts
        if (!isManualClose.current && 
            event.code !== 1000 && 
            event.code !== 1001 && 
            reconnectAttempts.current < maxReconnectAttempts) {
          
          reconnectAttempts.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000); // Exponential backoff, max 30s
          
          console.log(`Attempting WebSocket reconnection ${reconnectAttempts.current}/${maxReconnectAttempts} in ${delay}ms`);
          
          const timeout = setTimeout(() => {
            try {
              if (ws.current?.readyState === WebSocket.CLOSED && !isManualClose.current) {
                connect();
              }
            } catch (reconnectError) {
              console.error('Error during WebSocket reconnection:', reconnectError);
            }
          }, delay);
          
          reconnectTimeouts.current.push(timeout);
        }
      };
      
      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setReadyState(WebSocket.CLOSED);
      };
      
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      setReadyState(WebSocket.CLOSED);
    }
  }, []);

  useEffect(() => {
    isManualClose.current = false;
    connect();
    
    return () => {
      // Mark as manual close to prevent reconnection
      isManualClose.current = true;
      
      // Clear all reconnection timeouts
      reconnectTimeouts.current.forEach(timeout => clearTimeout(timeout));
      reconnectTimeouts.current = [];
      
      // Close connection if open
      if (ws.current && ws.current.readyState !== WebSocket.CLOSED) {
        ws.current.close(1000, 'Component unmounting');
      }
    };
  }, [connect]);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);

  const sendJsonMessage = useCallback((message: any) => {
    sendMessage(message);
  }, [sendMessage]);

  return {
    lastMessage,
    readyState,
    sendMessage,
    sendJsonMessage,
  };
}
