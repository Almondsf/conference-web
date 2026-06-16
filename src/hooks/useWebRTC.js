// src/hooks/useWebRTC.js
import { useRef, useState, useEffect } from "react";

const ICE_SERVERS = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export function useWebRTC({ localStream, send, currentUser }) {
  const peersRef = useRef({}); // email -> RTCPeerConnection
  const [remoteStreams, setRemoteStreams] = useState({}); // email -> MediaStream

  // Clean up all peers on unmount
  useEffect(() => {
    return () => {
      Object.values(peersRef.current).forEach((pc) => pc.close());
    };
  }, []);

  const addRemoteStream = (email, stream) => {
    setRemoteStreams((prev) => ({ ...prev, [email]: stream }));
  };

  const removeRemoteStream = (email) => {
    setRemoteStreams((prev) => {
      const next = { ...prev };
      delete next[email];
      return next;
    });
  };

  const createPeer = (remoteEmail, isInitiator) => {
    // Don't create duplicate connections
    if (peersRef.current[remoteEmail]) return peersRef.current[remoteEmail];

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peersRef.current[remoteEmail] = pc;

    // Add local tracks to the connection
    localStream?.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });

    // Send our ICE candidates to the remote peer via signaling
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        send({ type: "ice_candidate", target: remoteEmail, candidate });
      }
    };

    // When remote tracks arrive, store the stream
    pc.ontrack = ({ streams }) => {
      if (streams[0]) addRemoteStream(remoteEmail, streams[0]);
    };

    pc.onconnectionstatechange = () => {
      if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
        removeRemoteStream(remoteEmail);
        delete peersRef.current[remoteEmail];
      }
    };

    // If we're the initiator, create and send an offer
    if (isInitiator) {
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => {
          send({
            type: "offer",
            target: remoteEmail,
            sdp: pc.localDescription,
          });
        });
    }

    return pc;
  };

  const handleSignal = async (sender, payload) => {
    if (payload.type === "offer") {
      const pc = createPeer(sender, false);
      await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      send({ type: "answer", target: sender, sdp: pc.localDescription });
    }

    if (payload.type === "answer") {
      const pc = peersRef.current[sender];
      if (pc)
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
    }

    if (payload.type === "ice_candidate") {
      const pc = peersRef.current[sender];
      if (pc) await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
    }
  };

  const closePeer = (email) => {
    peersRef.current[email]?.close();
    delete peersRef.current[email];
    removeRemoteStream(email);
  };

  return { createPeer, handleSignal, closePeer, remoteStreams };
}
