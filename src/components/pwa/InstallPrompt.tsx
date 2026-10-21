import { useEffect, useState } from 'react';
import {
  closeIosHelp,
  isDebug,
  promptInstall,
  requestIosHelp,
  usePwaInstall,
  canOfferInstall,
} from './install-store';

// "Add to home screen" card, bottom right, above the chat launcher (the cup icon: the
// coffee chat assistant). Styled by .install-card in home-v2.css.
//
// - Chrome, Edge and Android fire beforeinstallprompt (captured in install-store): the card
//   offers an Install button that calls the stashed prompt.
// - iOS and iPadOS never fire it, in any browser, so the card shows the Share-sheet steps
//   instead. Chrome and Firefox on iOS add to the home screen through the same Share menu.
// - Shown on its own at most once per 30 days: never when installed, not before 8 seconds,
//   and not while a dialog, the mobile menu, the cookie banner or the chat panel is open.
// - No viewport or device gate: desktop Chrome gets the card whenever it fires the event.
// - ?pwa=debug (testing only) shows the card at once, ignoring the 30-day dismissal and
//   the delay, and logs whether beforeinstallprompt fired. It never shows when installed.
// - The "Install app" entries in the mobile menu and footer (InstallAppButton) are the
//   permanent route: they prompt directly, or open this card's iOS steps on demand.

const DISMISSED_KEY = 'pwa-install-dismissed-at';
const SNOOZE_MS = 30 * 24 * 60 * 60 * 1000;
const SHOW_AFTER_MS = 8000;

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

/** "Install app" for the mobile menu and footer. Renders nothing when install is not possible. */
export function InstallAppButton({ className, onDone, listItem = false }: { className?: string; onDone?: () => void; listItem?: boolean }) {
  const install = usePwaInstall();
  if (!canOfferInstall(install)) return null;
  const onClick = async () => {
    onDone?.();
    if (install.isIOS) requestIosHelp();
    else await promptInstall();
  };
  const button = (
    <button type="button" className={className} onClick={onClick}>
      Install app
    </button>
  );
  return listItem ? <li>{button}</li> : button;
}

export function InstallPrompt() {
  const install = usePwaInstall();
  const [debug] = useState(isDebug);
  const [eligible] = useState(() => debug || !recentlyDismissed());
  const [delayPassed, setDelayPassed] = useState(debug);
  const [closed, setClosed] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (debug) {
      console.info(install.installed
        ? '[pwa] already installed (standalone): card not shown'
        : `[pwa] debug: card forced; ${install.isIOS ? 'iOS steps' : 'waiting for beforeinstallprompt (Install stays disabled until it fires)'}`);
      return;
    }
    const timer = window.setTimeout(() => setDelayPassed(true), SHOW_AFTER_MS);
    return () => window.clearTimeout(timer);
    // Runs once per page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Asked for from the menu or footer: show the iOS steps now, whatever the snooze says.
  const onDemand = install.iosHelpRequested && install.isIOS;
  const automatic = eligible && delayPassed && !closed && (install.canPrompt || install.isIOS || debug);
  const wanted = !install.installed && (onDemand || automatic);

  // While the card is wanted, step aside for any other overlay.
  useEffect(() => {
    if (!wanted) return;
    const check = () => setBlocked(somethingElseIsOpen());
    check();
    const id = window.setInterval(check, 500);
    return () => window.clearInterval(id);
  }, [wanted]);

  if (!wanted || blocked) return null;

  const showSteps = install.isIOS;

  const notNow = () => {
    // Closing the on-demand iOS steps is not a dismissal of the automatic card.
    if (onDemand) closeIosHelp();
    else rememberDismissal();
    setClosed(true);
  };

  const onInstall = async () => {
    const outcome = await promptInstall();
    // Declining the browser's own dialog counts as "not now".
    if (outcome === 'dismissed') rememberDismissal();
    setClosed(true);
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

        {showSteps ? (
          <ol className="install-card-steps">
            <li>Tap the Share button <ShareIcon /></li>
            <li>Scroll down and tap “Add to Home Screen”</li>
            <li>Tap “Add”</li>
          </ol>
        ) : null}

        {debug && !showSteps && !install.canPrompt && (
          <p className="install-card-debug">Debug: the browser has not offered installation (no beforeinstallprompt yet).</p>
        )}

        <div className="install-card-actions">
          {!showSteps && (
            <button type="button" className="shop-empty-primary" onClick={onInstall} disabled={!install.canPrompt}>Install</button>
          )}
          <button type="button" className="install-card-later" onClick={notNow}>{onDemand ? 'Close' : 'Not now'}</button>
        </div>
      </div>
    </div>
  );
}
