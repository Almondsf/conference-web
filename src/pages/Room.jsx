// src/pages/Room.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../hooks/useSocket";
import { useMedia } from "../hooks/useMedia";
import { useWebRTC } from "../hooks/useWebRTC";
import VideoTile from "../components/VideoTile";
import api from "../api";

export default function Room() {
  const { code } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [status, setStatus] = useState("connecting");
  const isHost = room?.host_email === user?.email;
  const sendRef = useRef(null);

  // Media
  const {
    stream,
    error: mediaError,
    audioEnabled,
    videoEnabled,
    toggleAudio,
    toggleVideo,
    forceAudioOff,
  } = useMedia();

  // Fetch room details
  useEffect(() => {
    api
      .get(`/rooms/${code}/`)
      .then(({ data }) => setRoom(data))
      .catch(() => navigate("/rooms"));
  }, [code]);

  // WebRTC
  const { createPeer, handleSignal, closePeer, remoteStreams } = useWebRTC({
    localStream: stream,
    send: (data) => sendRef.current?.(data),
    currentUser: user?.email,
  });

  const handleMessage = useCallback(
    (data) => {
      switch (data.type) {
        case "authenticated":
          setStatus("connected");
          sendRef.current?.({ type: "get_participants" });
          break;

        case "participants_list":
          setParticipants(data.participants);
          data.participants
            .filter((email) => email !== user?.email)
            .forEach((email) => createPeer(email, true));
          break;

        case "user_joined":
          setParticipants((prev) =>
            prev.includes(data.user) ? prev : [...prev, data.user]
          );
          // They will send us an offer — we just wait
          break;

        case "user_left":
          setParticipants((prev) => prev.filter((p) => p !== data.user));
          closePeer(data.user);
          break;

        case "signaling_message":
          handleSignal(data.sender, data.payload);
          break;

        case "muted":
          forceAudioOff();
          break;

        case "error":
          console.error("Socket error:", data.message);
          break;

        case "kicked":
          navigate("/rooms");
          break;
      }
    },
    [stream]
  ); // re-run when stream is ready

  const { send } = useSocket(code, {
    onOpen: () => {
      const token = localStorage.getItem("access_token");
      send({ type: "authenticate", token });
    },
    onMessage: handleMessage,
    onClose: () => setStatus("error"),
  });

  useEffect(() => {
    sendRef.current = send;
  }, [send]);

  const leaveRoom = async () => {
    try {
      await api.post(`/rooms/${code}/leave/`);
    } catch {}
    navigate("/rooms");
  };

  const closeRoom = async () => {
    try {
      await api.delete(`/rooms/${code}/`);
    } catch {}
    navigate("/rooms");
  };

  const kickParticipant = async (email) => {
    try {
      await api.post(`/rooms/${code}/kick/${email}/`);
    } catch {}
  };

  const muteParticipant = (email) => {
    sendRef.current?.({ type: "mute", target: email });
  };

  const allParticipants = [
    { email: user?.email, isYou: true },
    ...participants
      .filter((e) => e !== user?.email)
      .map((email) => ({ email, isYou: false })),
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={leaveRoom}
            className="text-gray-400 hover:text-gray-600 transition-colors text-lg"
          >
            ←
          </button>
          <div>
            <h1 className="text-sm font-semibold text-gray-900">
              {room?.name ?? code}
            </h1>
            <p className="text-xs text-gray-400 font-mono">{code}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`flex items-center gap-1.5 text-xs font-medium ${
              status === "connected"
                ? "text-green-600"
                : status === "error"
                ? "text-red-500"
                : "text-gray-400"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                status === "connected"
                  ? "bg-green-500"
                  : status === "error"
                  ? "bg-red-500"
                  : "bg-gray-300"
              }`}
            />
            {status === "connected"
              ? "Connected"
              : status === "error"
              ? "Disconnected"
              : "Connecting…"}
          </span>

          {isHost && (
            <button
              onClick={closeRoom}
              className="text-xs text-red-500 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
            >
              End room
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-1 max-w-6xl mx-auto w-full px-4 py-6 gap-6">
        {/* Video grid */}
        <div className="flex-1 flex flex-col gap-4">
          {mediaError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
              Camera/mic error: {mediaError}. Check browser permissions.
            </div>
          )}

          <div
            className={`grid gap-3 ${
              allParticipants.length === 1
                ? "grid-cols-1"
                : allParticipants.length <= 4
                ? "grid-cols-2"
                : "grid-cols-3"
            }`}
          >
            {/* Local tile */}
            <VideoTile
              stream={stream}
              label={`You (${user?.email})`}
              muted={true}
              noVideo={!videoEnabled}
            />

            {/* Remote tiles */}
            {participants
              .filter((e) => e !== user?.email)
              .map((email) => (
                <VideoTile
                  key={email}
                  stream={remoteStreams[email]}
                  label={email}
                />
              ))}
          </div>

          {/* Controls bar */}
          <div className="flex items-center justify-center gap-3 mt-auto pt-4">
            <button
              onClick={toggleAudio}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                audioEnabled
                  ? "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                  : "bg-red-50 border-red-200 text-red-600"
              }`}
            >
              {audioEnabled ? "🎙️ Mute" : "🔇 Unmute"}
            </button>

            <button
              onClick={toggleVideo}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                videoEnabled
                  ? "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                  : "bg-red-50 border-red-200 text-red-600"
              }`}
            >
              {videoEnabled ? "📷 Stop video" : "📷 Start video"}
            </button>

            <button
              onClick={leaveRoom}
              className="px-4 py-2.5 rounded-xl text-sm font-medium bg-red-500 hover:bg-red-600 text-white transition-colors"
            >
              Leave
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="w-60 flex flex-col gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 flex-1">
            <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
              Participants · {allParticipants.length}
            </h2>

            <ul className="flex flex-col gap-2">
              {allParticipants.map(({ email, isYou }) => (
                <li
                  key={email}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 text-xs font-medium flex items-center justify-center shrink-0">
                      {email?.[0]?.toUpperCase()}
                    </div>
                    <span className="text-xs text-gray-700 truncate">
                      {isYou ? "You" : email}
                      {email === room?.host_email && (
                        <span className="ml-1 text-gray-300">· host</span>
                      )}
                    </span>
                  </div>

                  {isHost && !isYou && (
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => muteParticipant(email)}
                        title="Mute"
                        className="text-xs text-gray-400 hover:text-gray-700 px-1.5 py-0.5 rounded hover:bg-gray-100 transition-colors"
                      >
                        🔇
                      </button>
                      <button
                        onClick={() => kickParticipant(email)}
                        title="Kick"
                        className="text-xs text-gray-400 hover:text-red-500 px-1.5 py-0.5 rounded hover:bg-red-50 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
