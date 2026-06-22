// src/hooks/useMedia.js
import { useState, useEffect, useRef } from "react";

export function useMedia() {
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const streamRef = useRef(null);

  useEffect(() => {
    const getMedia = async () => {
      // First try audio + video
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        streamRef.current = s;
        setStream(s);
        return;
      } catch {}

      // Fall back to audio only if camera not available
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        streamRef.current = s;
        setStream(s);
        setVideoEnabled(false);
        setError("No camera found. Audio only.");
        return;
      } catch {}

      // Nothing works
      setError(
        "Could not access camera or microphone. Check browser permissions."
      );
    };

    getMedia();

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
