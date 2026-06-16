// src/hooks/useSocket.js
import { useEffect, useRef, useCallback } from "react";

export function useSocket(roomCode, { onMessage, onOpen, onClose } = {}) {
  const socketRef = useRef(null);
  const handlersRef = useRef({ onMessage, onOpen, onClose });

  useEffect(() => {
    handlersRef.current = { onMessage, onOpen, onClose };
  });

  const send = useCallback((data) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(data));
    }
  }, []);

  // Expose send via ref so handlers can call it immediately
  const sendRef = useRef(send);
  useEffect(() => {
    sendRef.current = send;
  }, [send]);

  useEffect(() => {
    if (!roomCode) return;

    const ws = new WebSocket(`ws://localhost:8001/ws/rooms/${roomCode}/`);
    socketRef.current = ws;

    ws.onopen = () => handlersRef.current.onOpen?.();
    ws.onmessage = (e) => handlersRef.current.onMessage?.(JSON.parse(e.data));
    ws.onclose = () => handlersRef.current.onClose?.();

    return () => ws.close();
  }, [roomCode]);

  return { send };
}
