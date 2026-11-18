// Synthetic Web Audio API Chimes (clean, subtle, zero-dependency)

let audioCtx = null;

const getAudioContext = () => {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
};

export const isSoundEnabled = () => {
  if (typeof window === "undefined") return true;
  return localStorage.getItem("chat_sound_enabled") !== "false";
};

export const setSoundEnabled = (enabled) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("chat_sound_enabled", enabled ? "true" : "false");
};

export const isNotificationEnabled = () => {
  if (typeof window === "undefined") return true;
  return localStorage.getItem("chat_notifications_enabled") !== "false";
};

export const setNotificationEnabled = (enabled) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("chat_notifications_enabled", enabled ? "true" : "false");
};

// Subtle WhatsApp-like message sent sound (soft short pop)
export const playSentSound = () => {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    const now = ctx.currentTime;

    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.09);
  } catch (err) {
    console.debug("Audio play error:", err);
  }
};

// Pleasant, gentle incoming message chime (crystal two-tone chord)
export const playReceivedSound = () => {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // First bell tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(659.25, now); // E5
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.22);

    // Second chime harmonic (starts slightly after)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.07); // A5
    gain2.gain.setValueAtTime(0.18, now + 0.07);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.07);
    osc2.stop(now + 0.35);
  } catch (err) {
    console.debug("Audio play error:", err);
  }
};

// Web Push / Desktop Notification
export const requestNotificationPermission = async () => {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }
  if (Notification.permission === "granted") {
    return true;
  }
  if (Notification.permission !== "denied") {
    const status = await Notification.requestPermission();
    return status === "granted";
  }
  return false;
};

export const showDesktopNotification = ({ title, body, icon, onClick }) => {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return;
  }
  if (!isNotificationEnabled()) {
    return;
  }
  if (Notification.permission !== "granted") {
    return;
  }

  // Only trigger if tab is running in background or hidden
  if (!document.hidden) {
    return;
  }

  try {
    const notification = new Notification(title || "New Message", {
      body: body || "You have a new message",
      icon: icon || "/vite.svg",
      silent: true, // We already handle audio chime
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
      onClick?.();
    };
  } catch (err) {
    console.debug("Notification error:", err);
  }
};

// ==========================================
// WebRTC Call Sound FX (Dual-Tone & Chimes)
// ==========================================

let ringtoneInterval = null;

export const stopCallRingtone = () => {
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
};

// Melodic incoming ringtone loop
export const startIncomingRingtone = () => {
  stopCallRingtone();
  if (!isSoundEnabled()) return;

  const playChimePulse = () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        gain.gain.setValueAtTime(0.14, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.35);
      });
    } catch (err) {
      console.debug("Incoming ringtone error:", err);
    }
  };

  playChimePulse();
  ringtoneInterval = setInterval(playChimePulse, 2400);
};

// Subtle outgoing dial tone pulse (standard US/European ringback: 440Hz + 480Hz)
export const startOutgoingRingtone = () => {
  stopCallRingtone();
  if (!isSoundEnabled()) return;

  const playDialPulse = () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      [440, 480].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 1.2);
      });
    } catch (err) {
      console.debug("Outgoing ringtone error:", err);
    }
  };

  playDialPulse();
  ringtoneInterval = setInterval(playDialPulse, 3500);
};

// Call disconnected chime (gentle two-tone drop)
export const playCallEndChime = () => {
  stopCallRingtone();
  if (!isSoundEnabled()) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(520, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.18);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(320, now + 0.15);
    gain2.gain.setValueAtTime(0.12, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.4);
  } catch (err) {
    console.debug("Call end chime error:", err);
  }
};
