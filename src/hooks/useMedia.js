// src/hooks/useMedia.js
import { useState, useEffect, useRef } from "react";

export function useMedia() {
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const streamRef = useRef(null);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ audio: true, video: true })
      .then((s) => {
        streamRef.current = s;
        setStream(s);
      })
      .catch((err) => {
        setError(err.message);
      });

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const toggleAudio = () => {
    const tracks = streamRef.current?.getAudioTracks() ?? [];
    tracks.forEach((t) => {
      t.enabled = !t.enabled;
    });
    setAudioEnabled((prev) => !prev);
  };

  const toggleVideo = () => {
    const tracks = streamRef.current?.getVideoTracks() ?? [];
    tracks.forEach((t) => {
      t.enabled = !t.enabled;
    });
    setVideoEnabled((prev) => !prev);
  };

  const forceAudioOff = () => {
    const tracks = streamRef.current?.getAudioTracks() ?? [];
    tracks.forEach((t) => {
      t.enabled = false;
    });
    setAudioEnabled(false);
  };

  return {
    stream,
    error,
    audioEnabled,
    videoEnabled,
    toggleAudio,
    toggleVideo,
    forceAudioOff,
  };
}
