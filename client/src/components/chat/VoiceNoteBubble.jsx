import { useState, useRef, useEffect, useMemo } from "react";
import { Play, Pause, Mic } from "lucide-react";
import { getMediaUrl } from "../../config/endpoints";

const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

// Generates pseudo-waveform bars based on URL hash for realistic distinct waveforms
const generateWaveform = (url, count = 28) => {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = (hash << 5) - hash + url.charCodeAt(i);
    hash |= 0;
  }
  const bars = [];
  for (let i = 0; i < count; i++) {
    const pseudoRandom = Math.abs(Math.sin((hash + i * 17) * 0.1));
    // Scale between 20% and 100% height
    bars.push(Math.round(20 + pseudoRandom * 80));
  }
  return bars;
};

const SPEED_OPTIONS = [1, 1.5, 2];

const VoiceNoteBubble = ({ mediaUrl, audioDuration, isMine }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(audioDuration || 0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const fullUrl = getMediaUrl(mediaUrl);
  const waveformBars = useMemo(() => generateWaveform(fullUrl, 26), [fullUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.error("Audio playback error:", err);
        });
    }
  };

  const handleBarClick = (index) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const progress = index / waveformBars.length;
    const targetTime = progress * duration;
    audio.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const handleCycleSpeed = () => {
    const currentIndex = SPEED_OPTIONS.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % SPEED_OPTIONS.length;
    const nextSpeed = SPEED_OPTIONS[nextIndex];
    setPlaybackSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const activeBarIndex = Math.floor((progressPercent / 100) * waveformBars.length);

  return (
    <div className="flex items-center gap-3 py-1.5 min-w-[240px] max-w-sm select-none">
      <audio ref={audioRef} src={fullUrl} preload="metadata" />

      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-primary)] text-white hover:scale-105 active:scale-95 transition-all shadow-md shadow-[var(--accent-primary)]/20"
        aria-label={isPlaying ? "Pause voice note" : "Play voice note"}
      >
        {isPlaying ? (
          <Pause size={17} fill="currentColor" />
        ) : (
          <Play size={17} fill="currentColor" className="ml-0.5" />
        )}
      </button>

      {/* Waveform & Timing Controls */}
      <div className="flex-1 min-w-0">
        {/* Interactive Waveform Bar Visualizer */}
        <div
          className="flex items-center gap-[2.5px] h-7 cursor-pointer px-1 py-1 group"
          title="Click to seek"
        >
          {waveformBars.map((heightPercent, index) => {
            const isPlayed = index <= activeBarIndex;
            const isCurrent = index === activeBarIndex && isPlaying;

            return (
              <button
                key={index}
                type="button"
                onClick={() => handleBarClick(index)}
                className="flex-1 h-full flex items-center justify-center p-0 bg-transparent border-0 focus:outline-none cursor-pointer"
                aria-label={`Seek to ${(index / waveformBars.length) * 100}%`}
              >
                <span
                  style={{ height: `${heightPercent}%` }}
                  className={`w-full rounded-full transition-all duration-150 ${
                    isPlayed
                      ? isMine
                        ? "bg-white dark:bg-white"
                        : "bg-[var(--accent-primary)]"
                      : isMine
                      ? "bg-white/40 dark:bg-white/30"
                      : "bg-[var(--text-muted)]/30 group-hover:bg-[var(--text-muted)]/50"
                  } ${isCurrent ? "scale-y-125 brightness-125" : ""}`}
                />
              </button>
            );
          })}
        </div>

        {/* Timestamps & Speed Control */}
        <div className="mt-1 flex items-center justify-between text-[11px] font-mono opacity-80 px-1">
          <span>{isPlaying ? formatDuration(currentTime) : formatDuration(duration)}</span>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[10px] opacity-75">
              <Mic size={10} /> Voice
            </span>

            {/* WhatsApp-style Speed Toggle Pill */}
            <button
              type="button"
              onClick={handleCycleSpeed}
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight transition cursor-pointer ${
                isMine
                  ? "bg-white/20 text-white hover:bg-white/30"
                  : "bg-[var(--bg-subtle)] text-[var(--text-primary)] hover:bg-[var(--border-color)]"
              }`}
              title="Change playback speed"
            >
              {playbackSpeed}x
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceNoteBubble;
