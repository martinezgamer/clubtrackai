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

  const connect = useCallback(() => {
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      ws.current = new WebSocket(wsUrl);
      
      ws.current.onopen = () => {
        setReadyState(WebSocket.OPEN);
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
        
        // Only reconnect if it wasn't a normal close (1000) or manual close
        if (event.code !== 1000 && event.code !== 1001) {
          const timeout = setTimeout(() => {
            try {
              if (ws.current?.readyState === WebSocket.CLOSED) {
                connect();
              }
            } catch (reconnectError) {
              console.error('Error during WebSocket reconnection:', reconnectError);
            }
          }, 5000); // Increased delay to 5 seconds
          
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
    connect();
    
    return () => {
      // Clear all reconnection timeouts
      reconnectTimeouts.current.forEach(timeout => clearTimeout(timeout));
      reconnectTimeouts.current = [];
      
      if (ws.current) {
        ws.current.close();
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
