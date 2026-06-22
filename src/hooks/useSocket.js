
import { useEffect, useRef, useCallback } from "react";

const MAX_RETRIES = 5;
const RETRY_DELAY = 2000; // 2 seconds between attempts

export function useSocket(
  roomCode,
  { onMessage, onOpen, onClose, onReconnecting } = {}
) {
  const socketRef = useRef(null);
  const handlersRef = useRef({ onMessage, onOpen, onClose, onReconnecting });
  const retriesRef = useRef(0);
  const intentionalClose = useRef(false);

  useEffect(() => {
    handlersRef.current = { onMessage, onOpen, onClose, onReconnecting };
  });

  const send = useCallback((data) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(data));
    }
  }, []);

  const connect = useCallback(() => {
    if (!roomCode) return;

    const ws = new WebSocket(
      `${import.meta.env.VITE_WS_URL}/ws/rooms/${roomCode}/`
    );
    socketRef.current = ws;

    ws.onopen = () => {
      retriesRef.current = 0; // reset retries on successful connection
      handlersRef.current.onOpen?.();
    };

    ws.onmessage = (e) => handlersRef.current.onMessage?.(JSON.parse(e.data));

    ws.onclose = () => {
      if (intentionalClose.current) return; // user left deliberately

      if (retriesRef.current < MAX_RETRIES) {
        retriesRef.current += 1;
        handlersRef.current.onReconnecting?.(retriesRef.current);
        setTimeout(connect, RETRY_DELAY);
      } else {
        // All retries exhausted
        handlersRef.current.onClose?.();
      }
    };
  }, [roomCode]);

  useEffect(() => {
    intentionalClose.current = false;
    connect();

    return () => {
      intentionalClose.current = true;
      socketRef.current?.close();
    };
  }, [connect]);

  const closeIntentionally = useCallback(() => {
    intentionalClose.current = true;
    socketRef.current?.close();
  }, []);

  return { send, closeIntentionally };
}
