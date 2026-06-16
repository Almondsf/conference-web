// src/components/VideoTile.jsx
import { useEffect, useRef } from "react";

export default function VideoTile({
  stream,
  label,
  muted = false,
  noVideo = false,
}) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative bg-gray-900 rounded-xl overflow-hidden aspect-video flex items-center justify-center">
      {stream && !noVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center gap-2">
          <div className="w-14 h-14 rounded-full bg-gray-700 text-white text-xl font-medium flex items-center justify-center">
            {label?.[0]?.toUpperCase() ?? "?"}
          </div>
          <span className="text-xs text-gray-500">
            {noVideo ? "Camera off" : "No stream"}
          </span>
        </div>
      )}

      {/* Name label */}
      <div className="absolute bottom-2 left-3">
        <span className="text-xs text-white bg-black/40 px-2 py-0.5 rounded-md">
          {label}
        </span>
      </div>
    </div>
  );
}
