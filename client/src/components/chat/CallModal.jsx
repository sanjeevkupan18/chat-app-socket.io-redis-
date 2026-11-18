import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Phone,
  Video,
  PhoneOff,
  Mic,
  MicOff,
  VideoOff,
  Volume2,
  VolumeX,
  RefreshCw,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { useCall } from "../../context/CallContext";
import { getMediaUrl } from "../../config/endpoints";

export const CallModal = () => {
  const {
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
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
    toggleSpeaker,
    switchCamera,
  } = useCall();

  const [isFullscreen, setIsFullscreen] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);

  // Attach local stream to preview element
  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream || null;
    }
  }, [localStream, callStatus]);

  // Attach remote stream to video or audio element
  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream || null;
      remoteVideoRef.current.muted = !isSpeakerOn;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream || null;
      remoteAudioRef.current.muted = !isSpeakerOn;
      remoteAudioRef.current.volume = 1.0;
      if (remoteStream) {
        remoteAudioRef.current.play().catch((err) => {
          console.warn("Audio element play error:", err);
        });
      }
    }
  }, [remoteStream, callStatus, isSpeakerOn]);

  if (callStatus === "idle" && !callError) {
    return null;
  }

  const partner = currentCall?.partner;
  const partnerName = partner?.name || "User";
  const partnerAvatar = partner?.avatar;
  const isVideoCall = (currentCall?.callType || callType) === "video";

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-md animate-in fade-in duration-200"
      style={{ backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" }}
    >
      {/* Hidden remote audio element for voice transmission */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Main Container */}
      <div
        className={`relative flex flex-col items-center justify-between overflow-hidden border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl transition-all duration-300 ${
          isFullscreen
            ? "fixed inset-0 rounded-none w-screen h-screen z-50 p-4 sm:p-6"
            : isVideoCall && callStatus === "connected"
            ? "w-full max-w-2xl h-[580px] rounded-3xl p-4 sm:p-6"
            : "w-full max-w-sm min-h-[460px] rounded-3xl p-6 sm:p-8"
        }`}
      >
        {/* Top Header Bar */}
        <div className="relative z-10 flex w-full items-center justify-between">
          {/* Call Type Badge */}
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-primary)]/15 px-3 py-1 text-xs font-semibold text-[var(--accent-primary)] shadow-sm">
            {isVideoCall ? <Video size={13} /> : <Phone size={13} />}
            <span>{isVideoCall ? "Video Call" : "Voice Call"}</span>
          </div>

          {/* Call Status / Timer */}
          <div className="text-center">
            {callStatus === "connected" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-0.5 text-xs font-semibold text-emerald-500">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                {formatDuration(callDuration)}
              </span>
            ) : (
              <span className="text-xs font-medium text-[var(--text-muted)] animate-pulse">
                {callStatus === "outgoing-ringing"
                  ? "Ringing..."
                  : callStatus === "incoming-ringing"
                  ? "Incoming..."
                  : callStatus === "connecting"
                  ? "Connecting..."
                  : callError || "Calling..."}
              </span>
            )}
          </div>

          {/* Fullscreen toggle for video */}
          {isVideoCall && callStatus === "connected" ? (
            <button
              type="button"
              onClick={() => setIsFullscreen((prev) => !prev)}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-black/40 text-white hover:bg-black/60 transition backdrop-blur-md"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
          ) : (
            <div className="w-8" />
          )}
        </div>

        {/* Center Media Body */}
        {isVideoCall && (callStatus === "connected" || callStatus === "connecting") ? (
          /* Video Interface */
          <div className="relative my-3 flex h-full w-full flex-1 items-center justify-center overflow-hidden rounded-2xl bg-black/90">
            {/* Remote Video Stream */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="h-full w-full object-cover"
            />

            {/* Fallback if remote video track hasn't arrived or is off */}
            {(!remoteStream || remoteStream.getVideoTracks().length === 0) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-gray-950 to-black p-4 text-center">
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-[var(--accent-primary)]/20 border-2 border-[var(--accent-primary)] shadow-lg">
                  {partnerAvatar ? (
                    <img
                      src={getMediaUrl(partnerAvatar)}
                      alt={partnerName}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl font-bold text-white">
                      {partnerName.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="absolute -inset-2 rounded-full border border-emerald-400/30 animate-ping" />
                </div>
                <h3 className="text-sm font-semibold text-white">{partnerName}</h3>
                <p className="text-xs text-gray-400">Connecting video feed...</p>
              </div>
            )}

            {/* Local Video Picture-in-Picture Preview */}
            <div className="absolute bottom-3 right-3 h-32 w-24 sm:h-36 sm:w-28 overflow-hidden rounded-xl border-2 border-white/20 bg-gray-900 shadow-2xl backdrop-blur-md">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted // CRITICAL: prevent local audio feedback echo
                className="h-full w-full object-cover"
                style={{ transform: "scaleX(-1)" }}
              />
              {isVideoDisabled && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 text-[10px] text-gray-300">
                  <VideoOff size={16} className="mb-1 text-red-400" />
                  <span>Camera Off</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Audio / Ringing Interface */
          <div className="my-6 flex flex-col items-center gap-4 text-center">
            <div className="relative">
              {/* Pulsing ring animation */}
              {(callStatus === "outgoing-ringing" || callStatus === "incoming-ringing") && (
                <>
                  <span className="absolute -inset-3 rounded-full bg-[var(--accent-primary)]/25 animate-ping duration-1000" />
                  <span className="absolute -inset-6 rounded-full bg-[var(--accent-primary)]/10 animate-pulse" />
                </>
              )}

              <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-[var(--bg-subtle)] bg-[var(--bg-subtle)] shadow-xl">
                {partnerAvatar ? (
                  <img
                    src={getMediaUrl(partnerAvatar)}
                    alt={partnerName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[var(--accent-primary)] text-3xl font-bold text-white">
                    {partnerName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">{partnerName}</h3>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {callStatus === "incoming-ringing"
                  ? `Incoming ${isVideoCall ? "video" : "voice"} call...`
                  : callStatus === "outgoing-ringing"
                  ? "Calling..."
                  : callStatus === "connected"
                  ? "Call in progress"
                  : callError || "Connecting..."}
              </p>
            </div>
          </div>
        )}

        {/* Bottom Action Controls */}
        <div className="relative z-10 flex w-full items-center justify-center gap-3 sm:gap-4 pt-2">
          {callStatus === "incoming-ringing" ? (
            /* Incoming Call Actions: Decline or Accept */
            <>
              {/* Decline Call */}
              <button
                type="button"
                onClick={rejectCall}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-xl transition-transform hover:scale-110 active:scale-95 hover:bg-red-700"
                title="Decline Call"
              >
                <PhoneOff size={24} />
              </button>

              {/* Accept Call */}
              <button
                type="button"
                onClick={acceptCall}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xl transition-transform hover:scale-110 active:scale-95 hover:bg-emerald-700 animate-pulse"
                title="Accept Call"
              >
                {isVideoCall ? <Video size={24} /> : <Phone size={24} />}
              </button>
            </>
          ) : (
            /* Active Call Controls */
            <>
              {/* Toggle Microphone */}
              <button
                type="button"
                onClick={toggleMute}
                className={`flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95 ${
                  isAudioMuted
                    ? "bg-red-500/20 text-red-500 hover:bg-red-500/30 border border-red-500/40"
                    : "bg-[var(--bg-subtle)] text-[var(--text-primary)] hover:bg-[var(--border-color)]"
                }`}
                title={isAudioMuted ? "Unmute microphone" : "Mute microphone"}
              >
                {isAudioMuted ? <MicOff size={20} /> : <Mic size={20} />}
              </button>

              {/* Video Specific: Toggle Camera */}
              {isVideoCall && (
                <button
                  type="button"
                  onClick={toggleCamera}
                  className={`flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95 ${
                    isVideoDisabled
                      ? "bg-red-500/20 text-red-500 hover:bg-red-500/30 border border-red-500/40"
                      : "bg-[var(--bg-subtle)] text-[var(--text-primary)] hover:bg-[var(--border-color)]"
                  }`}
                  title={isVideoDisabled ? "Turn on camera" : "Turn off camera"}
                >
                  {isVideoDisabled ? <VideoOff size={20} /> : <Video size={20} />}
                </button>
              )}

              {/* Video Specific: Switch Front / Back Camera */}
              {isVideoCall && (
                <button
                  type="button"
                  onClick={switchCamera}
                  className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-[var(--bg-subtle)] text-[var(--text-primary)] hover:bg-[var(--border-color)] transition-transform hover:scale-105 active:scale-95"
                  title="Switch camera"
                >
                  <RefreshCw size={19} />
                </button>
              )}

              {/* Speaker On / Off */}
              <button
                type="button"
                onClick={toggleSpeaker}
                className={`flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95 ${
                  !isSpeakerOn
                    ? "bg-amber-500/20 text-amber-500 border border-amber-500/40"
                    : "bg-[var(--bg-subtle)] text-[var(--text-primary)] hover:bg-[var(--border-color)]"
                }`}
                title={isSpeakerOn ? "Speaker on" : "Speaker off"}
              >
                {isSpeakerOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
              </button>

              {/* Hangup / End Call */}
              <button
                type="button"
                onClick={endCall}
                className="flex h-12 w-12 sm:h-13 sm:w-13 items-center justify-center rounded-full bg-red-600 text-white shadow-xl transition-transform hover:scale-110 active:scale-95 hover:bg-red-700"
                title="End Call"
              >
                <PhoneOff size={22} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : modalContent;
};

export default CallModal;
