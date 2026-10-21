import { useSyncExternalStore } from 'react';

// Shared install state for the install card, the mobile-menu entry and the footer entry.
// beforeinstallprompt is captured here, at module load, so the event is never missed by a
// component that mounts later; every entry point then calls the same stashed prompt.

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export type InstallState = {
  /** Chrome/Edge/Android offered installation (beforeinstallprompt fired). */
  canPrompt: boolean;
  /** iPhone/iPad: no install prompt exists; show the Share-sheet steps instead. */
  isIOS: boolean;
  /** Running as the installed app. */
  installed: boolean;
  /** The iOS steps were asked for from the menu or footer. */
  iosHelpRequested: boolean;
};

/** Testing switch: ?pwa=debug in the URL. */
export function isDebug() {
  try {
    return new URLSearchParams(window.location.search).get('pwa') === 'debug';
  } catch {
    return false;
  }
}

function detectInstalled() {
  try {
    const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
    return window.matchMedia('(display-mode: standalone)').matches || iosStandalone;
  } catch {
    return false;
  }
}

/** iPhone/iPod/iPad, including iPadOS 13+, which identifies as a Mac but has a touch screen. */
function detectIOS() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  return /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
}

let deferred: BeforeInstallPromptEvent | null = null;
let state: InstallState = {
  canPrompt: false,
  isIOS: typeof navigator !== 'undefined' && detectIOS(),
  installed: typeof window !== 'undefined' && detectInstalled(),
  iosHelpRequested: false,
};
const listeners = new Set<() => void>();

function update(patch: Partial<InstallState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    if (isDebug()) console.info('[pwa] beforeinstallprompt fired: Install is available');
    update({ canPrompt: true });
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    update({ canPrompt: false, installed: true });
  });
}

export function usePwaInstall(): InstallState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
    () => state,
  );
}

/** Opens the browser's own install dialog. Resolves with what the visitor chose. */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const event = deferred;
  if (!event) return 'unavailable';
  // A prompt event can be used only once.
  deferred = null;
  update({ canPrompt: false });
  try {
    await event.prompt();
    const { outcome } = await event.userChoice;
    return outcome;
  } catch {
    return 'unavailable';
  }
}

export function requestIosHelp() {
  update({ iosHelpRequested: true });
}

export function closeIosHelp() {
  update({ iosHelpRequested: false });
}

/** Menu and footer entries show only when installing is actually possible here. */
export function canOfferInstall(s: InstallState) {
  return !s.installed && (s.canPrompt || s.isIOS);
}
