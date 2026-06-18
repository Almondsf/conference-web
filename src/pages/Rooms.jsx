// src/pages/Rooms.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api";

export default function Rooms() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [maxParticipants, setMaxParticipants] = useState(5);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);

  const fetchRooms = async () => {
    try {
      const { data } = await api.get("/rooms/");
      setRooms(data);
    } catch {
    } finally {
      setLoadingRooms(false);
    }
  };

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 5000);
    return () => clearInterval(interval);
  }, []);

  const createRoom = async () => {
    if (!roomName.trim()) return setCreateError("Room name is required.");
    setCreateError("");
    setCreating(true);
    try {
      const { data } = await api.post("/rooms/", {
        name: roomName.trim(),
        max_participants: Number(maxParticipants),
      });
      await api.post(`/rooms/${data.code}/join/`);
      navigate(`/rooms/${data.code}`);
    } catch (err) {
      setCreateError(err.response?.data?.detail || "Could not create room.");
    } finally {
      setCreating(false);
    }
  };

  const joinRoom = async (code) => {
    setJoinError("");
    setJoining(true);
    try {
      await api.post(`/rooms/${code}/join/`);
      navigate(`/rooms/${code}`);
    } catch (err) {
      setJoinError(err.response?.data?.detail || "Could not join room.");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 flex items-center justify-between">
        <h1 className="text-base font-semibold tracking-tight text-gray-900">
          confr
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400 hidden sm:block">
            {user?.email}
          </span>
          <button
            onClick={logout}
            className="text-sm text-gray-500 hover:text-red-500 transition-colors"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 md:py-10">
        {/* Join by code */}
        <section className="mb-8 md:mb-10">
          <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
            Join a room
          </h2>
          <div className="flex gap-2">
            <input
              className="input flex-1 font-mono uppercase"
              placeholder="Enter room code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                joinCode.trim() &&
                joinRoom(joinCode.trim())
              }
            />
            <button
              onClick={() => joinRoom(joinCode.trim())}
              disabled={!joinCode.trim() || joining}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {joining ? "Joining…" : "Join"}
            </button>
          </div>
          {joinError && (
            <p className="mt-2 text-xs text-red-500">{joinError}</p>
          )}
        </section>

        {/* Active rooms */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Your rooms
            </h2>
            <button
              onClick={() => {
                setShowCreate(true);
                setCreateError("");
              }}
              className="text-sm text-blue-600 hover:underline font-medium"
            >
              + New room
            </button>
          </div>

          {loadingRooms ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : rooms.length === 0 ? (
            <div className="text-center py-12 md:py-16 border border-dashed border-gray-200 rounded-xl">
              <p className="text-sm text-gray-400">No active rooms.</p>
              <button
                onClick={() => setShowCreate(true)}
                className="mt-2 text-sm text-blue-600 hover:underline"
              >
                Start one
              </button>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {rooms.map((room) => (
                <li
                  key={room.id}
                  className="bg-white border border-gray-200 rounded-xl px-4 md:px-5 py-4 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {room.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <p className="text-xs text-gray-400 font-mono">
                        {room.code}
                      </p>
                      <button
                        onClick={() => navigator.clipboard.writeText(room.code)}
                        className="text-xs text-gray-300 hover:text-blue-500 transition-colors"
                      >
                        Copy
                      </button>
                      <span className="text-xs text-gray-300">·</span>
                      <p className="text-xs text-gray-400">
                        {room.participant_count}/{room.max_participants}
                        {room.is_locked && " · 🔒"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => joinRoom(room.code)}
                    className="text-sm text-blue-600 hover:underline font-medium shrink-0"
                  >
                    Join
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      {/* Create room modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center px-4 z-50 pb-0 sm:pb-0">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-lg p-6 md:p-8 w-full sm:max-w-sm">
            <h3 className="text-base font-semibold text-gray-900 mb-5">
              New room
            </h3>
            <div className="flex flex-col gap-3">
              <input
                className="input"
                placeholder="Room name"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                autoFocus
              />
              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  Max participants
                </label>
                <input
                  className="input"
                  type="number"
                  min={2}
                  max={50}
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(e.target.value)}
                />
              </div>
              {createError && (
                <p className="text-xs text-red-500">{createError}</p>
              )}
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setShowCreate(false);
                  setRoomName("");
                }}
                className="flex-1 py-3 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createRoom}
                disabled={creating}
                className="flex-1 py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-lg transition-colors"
              >
                {creating ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
