import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useAuth } from "./AuthContext";
import { useSocket } from "./SocketContext";
import { useWebRTC } from "../hooks/useWebRTC";
import {
  startIncomingRingtone,
  startOutgoingRingtone,
  stopCallRingtone,
  playCallEndChime,
  showDesktopNotification,
} from "../utils/soundAndNotification";

const CallContext = createContext(null);

export const CallProvider = ({ children }) => {
  const { user } = useAuth();
  const { socket } = useSocket();

  // Call status: 'idle' | 'outgoing-ringing' | 'incoming-ringing' | 'connecting' | 'connected'
  const [callStatus, setCallStatus] = useState("idle");
  const [callType, setCallType] = useState("audio"); // 'audio' | 'video'
  const [currentCall, setCurrentCall] = useState(null); // { callId, partner: { _id, name, avatar }, ... }
  const [callDuration, setCallDuration] = useState(0);
  const [callError, setCallError] = useState(null);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  const durationTimerRef = useRef(null);
  const activeCallRef = useRef(null);
  const remoteAudioRef = useRef(null);
  activeCallRef.current = currentCall;

  const {
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
    cleanup: cleanupWebRTC,
  } = useWebRTC();

  // Play remote audio through dedicated audio element (ensures voice calls always output sound)
  useEffect(() => {
    if (remoteAudioRef.current) {
      if (remoteStream) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.muted = !isSpeakerOn;
        remoteAudioRef.current.volume = 1.0;
        const playPromise = remoteAudioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn("Call remote audio playback pending user interaction:", err);
          });
        }
      } else {
        remoteAudioRef.current.srcObject = null;
      }
    }
  }, [remoteStream, isSpeakerOn]);

  // Reset all call state
  const resetCallState = useCallback(() => {
    stopCallRingtone();
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    cleanupWebRTC();
    setCallStatus("idle");
    setCurrentCall(null);
    setCallDuration(0);
  }, [cleanupWebRTC]);

  // Duration timer when connected
  useEffect(() => {
    if (callStatus === "connected") {
      setCallDuration(0);
      durationTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    }
    return () => {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
    };
  }, [callStatus]);

  // Initiate an outgoing call
  const startCall = useCallback(
    async (partnerUser, type = "audio") => {
      if (!socket || !partnerUser?._id) return;
      if (callStatus !== "idle") {
        console.warn("Already in a call or call in progress");
        return;
      }

      setCallError(null);
      setCallType(type);
      setCallStatus("outgoing-ringing");
      setCurrentCall({
        callId: null,
        partner: partnerUser,
        caller: user,
        receiver: partnerUser,
        callType: type,
      });

      startOutgoingRingtone();

      try {
        await startMedia(type);
      } catch (err) {
        console.error("Could not capture media for outgoing call:", err);
        setCallError("Could not access microphone or camera");
        playCallEndChime();
        resetCallState();
        return;
      }

      socket.emit("call:initiate", {
        receiverId: partnerUser._id,
        callType: type,
      });
    },
    [socket, user, callStatus, startMedia, resetCallState]
  );

  // Accept an incoming call
  const acceptCall = useCallback(async () => {
    if (!socket || !currentCall?.callId) return;

    stopCallRingtone();
    setCallStatus("connecting");
    const partnerId = currentCall.partner?._id;

    try {
      await startMedia(currentCall.callType || callType);

      // Initialize peer connection
      await initPeerConnection({
        onIceCandidate: (candidate) => {
          socket.emit("call:ice-candidate", {
            callId: currentCall.callId,
            to: partnerId,
            candidate,
          });
        },
        onConnectionStateChange: (state) => {
          if (state === "connected") {
            setCallStatus("connected");
          }
        },
      });

      socket.emit("call:accept", { callId: currentCall.callId });
    } catch (err) {
      console.error("Failed to accept call:", err);
      setCallError("Failed to access audio/video devices");
      playCallEndChime();
      socket.emit("call:reject", {
        callId: currentCall.callId,
        reason: "failed",
      });
      resetCallState();
    }
  }, [
    socket,
    currentCall,
    callType,
    startMedia,
    initPeerConnection,
    resetCallState,
  ]);

  // Reject an incoming call
  const rejectCall = useCallback(() => {
    if (socket && currentCall?.callId) {
      socket.emit("call:reject", {
        callId: currentCall.callId,
        reason: "declined",
      });
    }
    playCallEndChime();
    resetCallState();
  }, [socket, currentCall, resetCallState]);

  // End an active or ringing call
  const endCall = useCallback(() => {
    if (socket && currentCall?.callId) {
      socket.emit("call:end", { callId: currentCall.callId });
    }
    playCallEndChime();
    resetCallState();
  }, [socket, currentCall, resetCallState]);

  // Controls
  const toggleMute = useCallback(() => {
    toggleAudio(!isAudioMuted);
  }, [toggleAudio, isAudioMuted]);

  const toggleCamera = useCallback(() => {
    toggleVideo(!isVideoDisabled);
  }, [toggleVideo, isVideoDisabled]);

  const toggleSpeaker = useCallback(() => {
    setIsSpeakerOn((prev) => !prev);
  }, []);

  // Socket signaling event listeners
  useEffect(() => {
    if (!socket) return;

    // 1. Caller receives ringing confirmation with callId
    const handleCallRinging = ({ callId }) => {
      setCurrentCall((prev) => (prev ? { ...prev, callId } : prev));
    };

    // 2. Receiver receives incoming call notification
    const handleIncomingCall = ({ callId, callType: incomingType, caller }) => {
      if (activeCallRef.current || callStatus !== "idle") {
        socket.emit("call:reject", { callId, reason: "busy" });
        return;
      }

      setCallType(incomingType);
      setCurrentCall({
        callId,
        callType: incomingType,
        partner: caller,
        caller,
        receiver: user,
      });
      setCallStatus("incoming-ringing");
      startIncomingRingtone();

      showDesktopNotification({
        title: `Incoming ${incomingType === "video" ? "Video" : "Voice"} Call`,
        body: `${caller.name || "Someone"} is calling you...`,
        icon: caller.avatar || "/vite.svg",
      });
    };

    // 3. Caller receives call acceptance from receiver
    const handleCallAccepted = async ({ callId, receiver }) => {
      stopCallRingtone();
      setCallStatus("connecting");
      const partner = receiver || activeCallRef.current?.partner;
      const partnerId = partner?._id;

      setCurrentCall((prev) =>
        prev ? { ...prev, callId, partner: partner || prev.partner } : prev
      );

      try {
        await initPeerConnection({
          onIceCandidate: (candidate) => {
            socket.emit("call:ice-candidate", {
              callId,
              to: partnerId,
              candidate,
            });
          },
          onConnectionStateChange: (state) => {
            if (state === "connected") {
              setCallStatus("connected");
            }
          },
        });

        // Caller creates offer
        const offer = await createOffer();
        socket.emit("call:offer", { callId, offer, to: partnerId });
      } catch (err) {
        console.error("Error creating WebRTC offer:", err);
        playCallEndChime();
        resetCallState();
      }
    };

    // 4. Receiver receives offer from caller
    const handleCallOffer = async ({ callId, offer, from }) => {
      try {
        const partnerId = from || activeCallRef.current?.partner?._id;
        const answer = await createAnswer(offer);
        socket.emit("call:answer", { callId, answer, to: partnerId });
        setCallStatus("connected");
      } catch (err) {
        console.error("Error answering offer:", err);
        playCallEndChime();
        resetCallState();
      }
    };

    // 5. Caller receives answer from receiver
    const handleCallAnswer = async ({ answer }) => {
      try {
        await handleAnswer(answer);
        setCallStatus("connected");
      } catch (err) {
        console.error("Error handling remote answer:", err);
      }
    };

    // 6. ICE Candidate exchange
    const handleIceCandidate = async ({ candidate }) => {
      try {
        await addIceCandidate(candidate);
      } catch (err) {
        console.warn("Error processing ICE candidate:", err);
      }
    };

    // 7. Call termination events
    const handleCallEnded = ({ reason }) => {
      playCallEndChime();
      resetCallState();
    };

    const handleCallRejected = ({ reason }) => {
      playCallEndChime();
      setCallError(
        reason === "busy" ? "User is busy on another call" : "Call declined"
      );
      resetCallState();
    };

    const handleCallBusy = () => {
      playCallEndChime();
      setCallError("User is busy on another call");
      resetCallState();
    };

    const handleCallOffline = () => {
      playCallEndChime();
      setCallError("User is currently offline");
      resetCallState();
    };

    const handleCallMissed = () => {
      const partner = activeCallRef.current?.partner;
      const isReceiver = activeCallRef.current?.receiver?._id === user?._id;
      if (isReceiver && partner) {
        showDesktopNotification({
          title: "Missed Call",
          body: `You missed a ${callType === "video" ? "video" : "voice"} call from ${partner.name || "someone"}`,
          icon: partner.avatar || "/vite.svg",
        });
      }
      playCallEndChime();
      setCallError(isReceiver ? "Missed call" : "No answer");
      resetCallState();
    };

    socket.on("call:ringing", handleCallRinging);
    socket.on("call:incoming", handleIncomingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("call:offer", handleCallOffer);
    socket.on("call:answer", handleCallAnswer);
    socket.on("call:ice-candidate", handleIceCandidate);
    socket.on("call:ended", handleCallEnded);
    socket.on("call:rejected", handleCallRejected);
    socket.on("call:busy", handleCallBusy);
    socket.on("call:offline", handleCallOffline);
    socket.on("call:missed", handleCallMissed);

    return () => {
      socket.off("call:ringing", handleCallRinging);
      socket.off("call:incoming", handleIncomingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("call:offer", handleCallOffer);
      socket.off("call:answer", handleCallAnswer);
      socket.off("call:ice-candidate", handleIceCandidate);
      socket.off("call:ended", handleCallEnded);
      socket.off("call:rejected", handleCallRejected);
      socket.off("call:busy", handleCallBusy);
      socket.off("call:offline", handleCallOffline);
      socket.off("call:missed", handleCallMissed);
    };
  }, [
    socket,
    user,
    callStatus,
    initPeerConnection,
    createOffer,
    createAnswer,
    handleAnswer,
    addIceCandidate,
    resetCallState,
  ]);

  return (
    <CallContext.Provider
      value={{
        callStatus,
        callType,
        currentCall,
        callDuration,
        callError,
        localStream,
        remoteStream,
        isAudioMuted,
        isVideoDisabled,
        isSpeakerOn,
        currentFacingMode,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleCamera,
        toggleSpeaker,
        switchCamera,
      }}
    >
      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: "none" }} />
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error("useCall must be used within a CallProvider");
  }
  return context;
};
