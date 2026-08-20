/**
 * L2H CRM Browser Push Notifications & Web Audio Synthesizer Chime
 */

// ----------------------------------------------------
// 1. Web Audio Synthesizer Chimes (No external MP3 needed)
// ----------------------------------------------------

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    return audioCtx;
  } catch (e) {
    console.warn("AudioContext not supported or blocked:", e);
    return null;
  }
}

/**
 * Plays an elegant luxury two-tone chime for follow-up reminders
 */
export function playNotificationChime() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Note 1: E5 (659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.18, now + 0.03);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.35);

    // Note 2: B5 (987.77 Hz) - harmonic fifth
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(987.77, now + 0.12);
    gain2.gain.setValueAtTime(0, now + 0.12);
    gain2.gain.linearRampToValueAtTime(0.22, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now + 0.12);
    osc2.stop(now + 0.65);
  } catch (e) {
    console.warn("Error playing chime:", e);
  }
}

/**
 * Plays an alert tone for overdue / urgent follow-ups
 */
export function playUrgentAlertChime() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Three rapid alert pulses
    [0, 0.15, 0.3].forEach((delay, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(idx === 2 ? 880 : 740, now + delay);
      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.18, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + 0.12);
    });
  } catch (e) {
    console.warn("Error playing urgent chime:", e);
  }
}

// ----------------------------------------------------
// 2. Browser Desktop Push Notifications API
// ----------------------------------------------------

export type DesktopPermissionStatus = "granted" | "denied" | "default" | "unsupported";

export function isDesktopNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getDesktopNotificationPermission(): DesktopPermissionStatus {
  if (!isDesktopNotificationSupported()) return "unsupported";
  return Notification.permission as DesktopPermissionStatus;
}

export async function requestDesktopNotificationPermission(): Promise<DesktopPermissionStatus> {
  if (!isDesktopNotificationSupported()) return "unsupported";
  try {
    const permission = await Notification.requestPermission();
    return permission as DesktopPermissionStatus;
  } catch (e) {
    console.warn("Error requesting notification permission:", e);
    return "denied";
  }
}

export interface DesktopNotificationOptions {
  body: string;
  icon?: string;
  tag?: string;
  onClickUrl?: string;
  requireInteraction?: boolean;
}

/**
 * Sends a native browser desktop notification
 */
export function sendDesktopNotification(
  title: string,
  options: DesktopNotificationOptions
): Notification | null {
  if (!isDesktopNotificationSupported()) return null;
  if (Notification.permission !== "granted") return null;

  try {
    const notification = new Notification(title, {
      body: options.body,
      icon: options.icon || "/logo.png",
      tag: options.tag || "l2h-followup",
      requireInteraction: options.requireInteraction ?? false,
    });

    notification.onclick = () => {
      window.focus();
      if (options.onClickUrl) {
        window.location.href = options.onClickUrl;
      }
      notification.close();
    };

    // Auto close after 8 seconds if not interacted
    setTimeout(() => {
      try {
        notification.close();
      } catch (_) {}
    }, 8000);

    return notification;
  } catch (e) {
    console.warn("Error triggering desktop notification:", e);
    return null;
  }
}
