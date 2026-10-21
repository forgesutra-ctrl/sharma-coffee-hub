import { useEffect, useRef, useState } from 'react';

// "Add to home screen" card, bottom right, above the chat launcher. Styled by
// .install-card in home-v2.css.
//
// - Chrome, Edge and Android fire beforeinstallprompt: the event is stashed and the card
//   offers an Install button that calls prompt().
// - iOS and iPadOS never fire it, in any browser, so the card shows the Share-sheet steps
//   instead. Chrome and Firefox on iOS add to the home screen through the same Share menu.
// - Never shown when already installed, within 30 days of "Not now", before 8 seconds,
//   or while a dialog, the mobile menu, the cookie banner or the chat panel is open.

const DISMISSED_KEY = 'pwa-install-dismissed-at';
const SNOOZE_MS = 30 * 24 * 60 * 60 * 1000;
const SHOW_AFTER_MS = 8000;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function isInstalled() {
  try {
    const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
    return window.matchMedia('(display-mode: standalone)').matches || iosStandalone;
  } catch {
    return false;
  }
}

/** iPhone/iPod/iPad, including iPadOS 13+, which identifies as a Mac but has a touch screen. */
function isIOS() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  return /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
}

function recentlyDismissed() {
  try {
    const at = Number(localStorage.getItem(DISMISSED_KEY));
    return Number.isFinite(at) && at > 0 && Date.now() - at < SNOOZE_MS;
  } catch {
    return false;
  }
}

function rememberDismissal() {
  try {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  } catch {
    // Storage unavailable (private mode): the card simply may return next visit.
  }
}

/** Anything else that wants the screen: two overlays at once is a mess. */
function somethingElseIsOpen() {
  return (
    !!document.querySelector('[role="dialog"]') ||
    document.body.classList.contains('site-menu-open') ||
    !!document.querySelector('[data-overlay="cookie-consent"]') ||
    !!document.querySelector('.chat-launcher[aria-label^="Close"]')
  );
}

/** The iOS share glyph: an open-topped box with an arrow leaving it. */
function ShareIcon() {
  return (
    <svg className="install-card-share" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 15V3" />
      <path d="M8 7l4-4 4 4" />
      <path d="M9 10H6.5A1.5 1.5 0 0 0 5 11.5v8A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 17.5 10H15" />
    </svg>
  );
}

export function InstallPrompt() {
  const [mode, setMode] = useState<'none' | 'prompt' | 'ios'>('none');
  const [delayPassed, setDelayPassed] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const deferred = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isInstalled() || recentlyDismissed()) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferred.current = e as BeforeInstallPromptEvent;
      setMode('prompt');
    };
    const onInstalled = () => {
      deferred.current = null;
      setMode('none');
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    if (isIOS()) setMode('ios');
    const timer = window.setTimeout(() => setDelayPassed(true), SHOW_AFTER_MS);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      window.clearTimeout(timer);
    };
  }, []);

  // While the card could show, step aside for any other overlay.
  useEffect(() => {
    if (mode === 'none' || !delayPassed) return;
    const check = () => setBlocked(somethingElseIsOpen());
    check();
    const id = window.setInterval(check, 500);
    return () => window.clearInterval(id);
  }, [mode, delayPassed]);

  if (mode === 'none' || !delayPassed || blocked) return null;

  const notNow = () => {
    rememberDismissal();
    setMode('none');
  };

  const install = async () => {
    const event = deferred.current;
    if (!event) return;
    deferred.current = null;
    try {
      await event.prompt();
      const { outcome } = await event.userChoice;
      // Declining the browser's own dialog counts as "not now".
      if (outcome === 'dismissed') rememberDismissal();
    } catch {
      // The browser refused to show its dialog; do not leave a dead button on screen.
    }
    setMode('none');
  };

  return (
    <div className="home-v2 install-card" role="region" aria-label="Install Sharma Coffee">
      <div className="install-card-inner">
        <div className="install-card-head">
          <img src="/pwa-192x192.png" alt="" width={44} height={44} />
          <div>
            <p className="install-card-title">Sharma Coffee on your home screen</p>
            <p className="install-card-copy">One tap to our coffees, your cart and your orders.</p>
          </div>
        </div>

        {mode === 'ios' ? (
          <ol className="install-card-steps">
            <li>Tap the Share button <ShareIcon /></li>
            <li>Scroll down and tap “Add to Home Screen”</li>
            <li>Tap “Add”</li>
          </ol>
        ) : null}

        <div className="install-card-actions">
          {mode === 'prompt' && (
            <button type="button" className="shop-empty-primary" onClick={install}>Install</button>
          )}
          <button type="button" className="install-card-later" onClick={notNow}>Not now</button>
        </div>
      </div>
    </div>
  );
}
