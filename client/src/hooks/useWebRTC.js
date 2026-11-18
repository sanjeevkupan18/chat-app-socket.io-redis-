import { useState, useRef, useCallback } from "react";
import api from "../services/api";

const DEFAULT_ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

export const useWebRTC = () => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(false);
  const [currentFacingMode, setCurrentFacingMode] = useState("user");

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const iceCandidatesQueueRef = useRef([]);
  const iceServersRef = useRef(DEFAULT_ICE_SERVERS);

  // Fetch ICE credentials from server if available
  const fetchIceServers = useCallback(async () => {
    try {
      const res = await api.post("/calls/ice-credentials");
      if (res.data?.success && res.data.iceServers?.length > 0) {
        iceServersRef.current = res.data.iceServers;
      }
    } catch {
      // Fallback to Google STUN servers
      iceServersRef.current = DEFAULT_ICE_SERVERS;
    }
    return iceServersRef.current;
  }, []);

  // Request user media (mic & optional camera)
  const startMedia = useCallback(async (callType = "audio") => {
    // Stop any existing tracks first
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    const constraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video:
        callType === "video"
          ? {
              width: { ideal: 1280, max: 1920 },
              height: { ideal: 720, max: 1080 },
              facingMode: "user",
            }
          : false,
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsAudioMuted(false);
      setIsVideoDisabled(callType !== "video");

      if (pcRef.current) {
        stream.getTracks().forEach((track) => {
          const senders = pcRef.current.getSenders();
          const alreadyAdded = senders.some((s) => s.track === track);
          if (!alreadyAdded) {
            try {
              pcRef.current.addTrack(track, stream);
            } catch (err) {
              console.warn("Error adding track to existing PC:", err);
            }
          }
        });
      }

      return stream;
    } catch (err) {
      console.error("Failed to access media devices:", err);
      // Fallback: If video failed (e.g. no camera attached), try audio-only
      if (callType === "video") {
        try {
          const audioOnlyStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          localStreamRef.current = audioOnlyStream;
          setLocalStream(audioOnlyStream);
          setIsAudioMuted(false);
          setIsVideoDisabled(true);

          if (pcRef.current) {
            audioOnlyStream.getTracks().forEach((track) => {
              const senders = pcRef.current.getSenders();
              const alreadyAdded = senders.some((s) => s.track === track);
              if (!alreadyAdded) {
                try {
                  pcRef.current.addTrack(track, audioOnlyStream);
                } catch (err) {
                  console.warn("Error adding fallback audio track:", err);
                }
              }
            });
          }

          return audioOnlyStream;
        } catch (audioErr) {
          console.error("Failed to access microphone:", audioErr);
          throw audioErr;
        }
      }
      throw err;
    }
  }, []);

  // Initialize RTCPeerConnection
  const initPeerConnection = useCallback(
    async ({ onIceCandidate, onConnectionStateChange }) => {
      await fetchIceServers();

      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }

      iceCandidatesQueueRef.current = [];

      const pc = new RTCPeerConnection({
        iceServers: iceServersRef.current,
        iceCandidatePoolSize: 2,
      });

      pcRef.current = pc;

      // Handle local ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && onIceCandidate) {
          onIceCandidate(event.candidate);
        }
      };

      // Handle incoming remote media tracks
      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          remoteStreamRef.current = event.streams[0];
          setRemoteStream(event.streams[0]);
        } else {
          // Fallback track-based assembly
          if (!remoteStreamRef.current) {
            remoteStreamRef.current = new MediaStream();
            setRemoteStream(remoteStreamRef.current);
          }
          remoteStreamRef.current.addTrack(event.track);
        }
      };

      // Connection state monitoring
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          onConnectionStateChange?.("connected");
        } else if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          onConnectionStateChange?.(pc.connectionState);
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
          onConnectionStateChange?.("connected");
        } else if (pc.iceConnectionState === "failed") {
          pc.restartIce?.();
        }
      };

      // Attach local tracks if stream is already initialized
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current);
        });
      }

      return pc;
    },
    [fetchIceServers]
  );

  // Helper to drain queued ICE candidates after setRemoteDescription
  const drainIceCandidatesQueue = useCallback(async () => {
    if (!pcRef.current || !pcRef.current.remoteDescription) return;
    while (iceCandidatesQueueRef.current.length > 0) {
      const candidate = iceCandidatesQueueRef.current.shift();
      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn("Error adding queued ICE candidate:", err);
      }
    }
  }, []);

  // Create WebRTC Offer (Caller)
  const createOffer = useCallback(async () => {
    if (!pcRef.current) throw new Error("PeerConnection not initialized");
    const offer = await pcRef.current.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await pcRef.current.setLocalDescription(offer);
    return offer;
  }, []);

  // Handle incoming Offer and create Answer (Receiver)
  const createAnswer = useCallback(
    async (remoteOffer) => {
      if (!pcRef.current) throw new Error("PeerConnection not initialized");
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(remoteOffer));
      await drainIceCandidatesQueue();

      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);
      return answer;
    },
    [drainIceCandidatesQueue]
  );

  // Handle incoming Answer (Caller)
  const handleAnswer = useCallback(
    async (remoteAnswer) => {
      if (!pcRef.current) throw new Error("PeerConnection not initialized");
      if (pcRef.current.signalingState !== "have-local-offer") {
        console.warn(`Ignoring handleAnswer in signaling state: ${pcRef.current.signalingState}`);
        return;
      }
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(remoteAnswer));
      await drainIceCandidatesQueue();
    },
    [drainIceCandidatesQueue]
  );

  // Handle incoming ICE Candidate from peer
  const addIceCandidate = useCallback(
    async (candidate) => {
      if (!candidate) return;
      if (pcRef.current && pcRef.current.remoteDescription && pcRef.current.remoteDescription.type) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn("Error adding ICE candidate:", err);
        }
      } else {
        // Queue candidates until remote description is set
        iceCandidatesQueueRef.current.push(candidate);
      }
    },
    []
  );

  // Mute / Unmute microphone
  const toggleAudio = useCallback((muted) => {
    if (!localStreamRef.current) return;
    const audioTracks = localStreamRef.current.getAudioTracks();
    audioTracks.forEach((track) => {
      track.enabled = !muted;
    });
    setIsAudioMuted(muted);
  }, []);

  // Turn Camera on / off
  const toggleVideo = useCallback((disabled) => {
    if (!localStreamRef.current) return;
    const videoTracks = localStreamRef.current.getVideoTracks();
    videoTracks.forEach((track) => {
      track.enabled = !disabled;
    });
    setIsVideoDisabled(disabled);
  }, []);

  // Switch between front and back camera (on supported devices)
  const switchCamera = useCallback(async () => {
    if (!localStreamRef.current) return;
    const newFacingMode = currentFacingMode === "user" ? "environment" : "user";

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      const newVideoTrack = newStream.getVideoTracks()[0];
      const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];

      if (oldVideoTrack) {
        localStreamRef.current.removeTrack(oldVideoTrack);
        oldVideoTrack.stop();
      }

      localStreamRef.current.addTrack(newVideoTrack);

      if (pcRef.current) {
        const sender = pcRef.current.getSenders().find((s) => s.track && s.track.kind === "video");
        if (sender) {
          await sender.replaceTrack(newVideoTrack);
        }
      }

      setCurrentFacingMode(newFacingMode);
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
    } catch (err) {
      console.warn("Could not switch camera:", err);
    }
  }, [currentFacingMode]);

  // Clean up all streams and peer connections
  const cleanup = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      localStreamRef.current = null;
      setLocalStream(null);
    }

    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      remoteStreamRef.current = null;
      setRemoteStream(null);
    }

    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch {}
      pcRef.current = null;
    }

    iceCandidatesQueueRef.current = [];
    setIsAudioMuted(false);
    setIsVideoDisabled(false);
  }, []);

  return {
    localStream,
    remoteStream,
    isAudioMuted,
    isVideoDisabled,
    currentFacingMode,
    startMedia,
    initPeerConnection,
    createOffer,
    createAnswer,
    handleAnswer,
    addIceCandidate,
    toggleAudio,
    toggleVideo,
    switchCamera,
    cleanup,
  };
};
