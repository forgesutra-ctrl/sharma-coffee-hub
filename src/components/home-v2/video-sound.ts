// The hero video's sound preference.
//
// Browsers only allow audio after a real user gesture (click, tap or key press; scrolling
// does not count), so the hero always starts muted. If a visitor turns the sound on, that
// choice is remembered; on later visits the video is unmuted at their first click, tap or
// key press, or straight away if they already interacted with the page (for example by
// clicking through to the homepage). Nobody is ever unmuted without having asked for it.

const KEY = 'hero-video-sound';

export function wantsSound(): boolean {
  try {
    return localStorage.getItem(KEY) === 'on';
  } catch {
    return false;
  }
}

export function rememberSound(on: boolean) {
  try {
    if (on) localStorage.setItem(KEY, 'on');
    else localStorage.removeItem(KEY);
  } catch {
    // Storage unavailable (private mode): the choice simply is not remembered.
  }
}

/**
 * The browser's own record of whether the page has had a click, tap or key press.
 * null where the API is missing (older Safari): callers then trust the event itself.
 */
export function hasUserActivation(): boolean | null {
  const ua = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
  return ua ? ua.hasBeenActive : null;
}

/**
 * Events that may carry a user gesture. A touch only grants it on lift (pointerup/touchend),
 * a mouse on press, so all are listened for and the activation flag decides. Scroll and
 * wheel are deliberately absent: they never let a page play sound.
 */
export const GESTURE_EVENTS = ['pointerdown', 'pointerup', 'touchend', 'keydown'] as const;
