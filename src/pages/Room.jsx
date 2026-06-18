// src/pages/Room.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../hooks/useSocket";
import { useMedia } from "../hooks/useMedia";
import { useWebRTC } from "../hooks/useWebRTC";
import VideoTile from "../components/VideoTile";
import api from "../api";
import {
  Mic,
  MicOff,
  Camera,
  CameraOff,
  Lock,
  Unlock,
  Users,
  ArrowLeft,
  X,
} from "lucide-react";

export default function Room() {
  const { code } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [status, setStatus] = useState("connecting");
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [mutedByHost, setMutedByHost] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);

  const isHost = room?.host_email === user?.email;
  const sendRef = useRef(null);
  const wasConnectedRef = useRef(false);

  const {
    stream,
    error: mediaError,
    audioEnabled,
    videoEnabled,
    toggleAudio,
    toggleVideo,
    forceAudioOff,
  } = useMedia();

  useEffect(() => {
    api
      .get(`/rooms/${code}/`)
      .then(({ data }) => {
        setRoom(data);
        setIsLocked(data.is_locked);
      })
      .catch(() => navigate("/rooms"))
      .finally(() => setLoadingRoom(false));
  }, [code]);

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
          wasConnectedRef.current = true;
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
          break;
        case "user_left":
          setParticipants((prev) => prev.filter((p) => p !== data.user));
          closePeer(data.user);
          break;
        case "signaling_message":
          handleSignal(data.sender, data.payload);
          break;
        case "kicked":
          navigate("/rooms");
          break;
        case "muted":
          forceAudioOff();
          setMutedByHost(true);
          setTimeout(() => setMutedByHost(false), 4000);
          break;
        case "error":
          console.error("Socket error:", data.message);
          break;
      }
    },
    [stream]
  );

  const { send } = useSocket(code, {
    onOpen: () => {
      const token = localStorage.getItem("access_token");
      send({ type: "authenticate", token });
    },
    onMessage: handleMessage,
    onClose: () => {
      setStatus("error");
      if (wasConnectedRef.current) navigate("/rooms");
    },
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

  const toggleLock = async () => {
    try {
      await api.post(`/rooms/${code}/lock/`);
      setIsLocked((prev) => !prev);
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

  if (loadingRoom) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400">Joining room…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={leaveRoom}
            className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-gray-900 truncate">
              {room?.name ?? code}
            </h1>
            <p className="text-xs text-gray-400 font-mono">{code}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Connection status */}
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
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                status === "connected"
                  ? "bg-green-500"
                  : status === "error"
                  ? "bg-red-500"
                  : "bg-gray-300"
              }`}
            />
            <span className="hidden sm:block">
              {status === "connected"
                ? "Connected"
                : status === "error"
                ? "Disconnected"
                : "Connecting…"}
            </span>
          </span>

          {/* Participants toggle — mobile only */}
          <button
            onClick={() => setShowParticipants((prev) => !prev)}
            className="md:hidden flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Users size={13} />
            <span>{allParticipants.length}</span>
          </button>

          {isHost && (
            <div className="flex items-center gap-2">
              <button
                onClick={toggleLock}
                className={`hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  isLocked
                    ? "text-yellow-600 border-yellow-200 hover:bg-yellow-50"
                    : "text-gray-500 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {isLocked ? <Lock size={13} /> : <Unlock size={13} />}
                <span>{isLocked ? "Locked" : "Lock"}</span>
              </button>
              <button
                onClick={closeRoom}
                className="text-xs text-red-500 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
              >
                End
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1 relative overflow-hidden">
        {/* Main video area */}
        <div className="flex-1 flex flex-col gap-3 p-3 md:p-6">
          {/* Banners */}
          {mediaError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs md:text-sm px-3 md:px-4 py-2.5 md:py-3 rounded-xl">
              Camera/mic error: {mediaError}.
            </div>
          )}
          {mutedByHost && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs md:text-sm px-3 md:px-4 py-2.5 md:py-3 rounded-xl flex items-center justify-between">
              <span className="flex items-center gap-2">
                <MicOff size={14} />
                You were muted by the host.
              </span>
              <button
                onClick={() => setMutedByHost(false)}
                className="text-yellow-600 text-xs font-medium ml-2"
              >
                Dismiss
              </button>
            </div>
          )}
          {/* Video grid */}
          <div
            className={`grid gap-2 md:gap-3 flex-1 ${
              allParticipants.length === 1
                ? "grid-cols-1"
                : allParticipants.length <= 4
                ? "grid-cols-2"
                : "grid-cols-2 md:grid-cols-3"
            }`}
          >
            <VideoTile
              stream={stream}
              label={`You (${user?.email})`}
              muted={true}
              noVideo={!videoEnabled}
            />
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

          {/* Controls */}
          <div className="flex items-center justify-center gap-2 md:gap-3 py-2">
            <button
              onClick={toggleAudio}
              className={`flex items-center gap-1.5 px-3 md:px-4 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-medium border transition-colors ${
                audioEnabled
                  ? "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                  : "bg-red-50 border-red-200 text-red-600"
              }`}
            >
              {audioEnabled ? <Mic size={15} /> : <MicOff size={15} />}
              <span>{audioEnabled ? "Mute" : "Unmute"}</span>
            </button>

            <button
              onClick={toggleVideo}
              className={`flex items-center gap-1.5 px-3 md:px-4 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-medium border transition-colors ${
                videoEnabled
                  ? "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                  : "bg-red-50 border-red-200 text-red-600"
              }`}
            >
              {videoEnabled ? <Camera size={15} /> : <CameraOff size={15} />}
              <span>{videoEnabled ? "Stop" : "Start"}</span>
            </button>

            {/* Lock button — mobile only, inside controls */}
            {isHost && (
              <button
                onClick={toggleLock}
                className={`sm:hidden flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                  isLocked
                    ? "text-yellow-600 border-yellow-200 bg-yellow-50"
                    : "text-gray-500 border-gray-200 bg-white"
                }`}
              >
                {isLocked ? <Lock size={13} /> : <Unlock size={13} />}
              </button>
            )}

            <button
              onClick={leaveRoom}
              className="px-3 md:px-4 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-medium bg-red-500 hover:bg-red-600 text-white transition-colors"
            >
              Leave
            </button>
          </div>
        </div>

        {/* Sidebar — desktop always visible, mobile toggleable */}
        <aside
          className={`
          absolute inset-y-0 right-0 w-64 bg-white border-l border-gray-200 flex flex-col p-4 z-10
          transition-transform duration-200
          ${showParticipants ? "translate-x-0" : "translate-x-full"}
          md:relative md:translate-x-0 md:w-60
        `}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Participants · {allParticipants.length}
            </h2>
            <button
              onClick={() => setShowParticipants(false)}
              className="md:hidden text-gray-400 hover:text-gray-600 text-lg leading-none"
            >
              ×
            </button>
          </div>

          <ul className="flex flex-col gap-2 overflow-y-auto">
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
                  <button
                    onClick={() => muteParticipant(email)}
                    title="Mute"
                    className="text-gray-400 hover:text-gray-700 px-1.5 py-0.5 rounded hover:bg-gray-100 transition-colors shrink-0"
                  >
                    <MicOff size={13} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </aside>

        {/* Overlay when sidebar open on mobile */}
        {showParticipants && (
          <button
            onClick={() => setShowParticipants(false)}
            className="md:hidden text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
