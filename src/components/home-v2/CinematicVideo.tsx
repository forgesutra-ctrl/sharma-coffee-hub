import { useEffect, useRef, useState } from 'react';
import { Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { MediaAsset } from '@/lib/site-media';
import { GESTURE_EVENTS, hasUserActivation, rememberSound, wantsSound } from './video-sound';

const SOUND_LABEL_MS = 6000;
// Once per page load: the hero remounts on every film switch and should not re-announce itself.
let soundLabelShown = false;

// Ported from the reference redesign. Plays only while at least 12% of the video is
// on screen, and stays paused for users who prefer reduced motion.
//
// The reference sets a single WebM `src`, which leaves Safari/iOS with a blank box.
// This emits WebM first and the MP4 fallback second, so each browser picks the first
// one it can play. Because the sources are children, swapping films needs a remount:
// give the component a `key` that changes with the film.
//
// `soundPreference` (the hero only): the sound button carries a "Tap/Click for sound" label
// for its first few seconds, and the visitor's choice is remembered (see video-sound.ts).
// The video always starts muted; it is only ever unmuted by a direct gesture on the button,
// or for a returning visitor who asked for sound, at their first click, tap or key press.
export function CinematicVideo({
  media,
  poster,
  className = '',
  label,
  controls = false,
  soundPreference = false,
}: {
  media: MediaAsset;
  poster: string;
  className?: string;
  label: string;
  controls?: boolean;
  soundPreference?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [soundLabel, setSoundLabel] = useState(soundPreference && !soundLabelShown);
  const [touch] = useState(() => {
    try {
      return window.matchMedia('(hover: none)').matches;
    } catch {
      return false;
    }
  });

  // The label invites; after a few seconds it fades back to the bare icon.
  useEffect(() => {
    if (!soundPreference) return;
    soundLabelShown = true;
    const timer = window.setTimeout(() => setSoundLabel(false), SOUND_LABEL_MS);
    return () => window.clearTimeout(timer);
  }, [soundPreference]);

  // A returning visitor who turned the sound on: unmute once the browser allows it, which is
  // after a click, tap or key press on the page (possibly an earlier one, such as the click
  // that brought them here). Never without a stored preference.
  useEffect(() => {
    if (!soundPreference || !wantsSound()) return;
    const unmute = () => {
      const video = ref.current;
      if (!video) return;
      video.muted = false;
      setMuted(false);
    };
    if (hasUserActivation() === true) {
      unmute();
      return;
    }
    const options = { capture: true, passive: true } as const;
    const stop = () => GESTURE_EVENTS.forEach((type) => window.removeEventListener(type, onGesture, options));
    function onGesture(event: Event) {
      // A press on the sound button itself is the button's to handle (else it would undo this).
      if (event.target instanceof Element && event.target.closest('.video-sound')) {
        stop();
        return;
      }
      // A touch press is not yet a gesture; its lift is. Older Safari has no flag: trust the event.
      if (hasUserActivation() === false) return;
      stop();
      unmute();
    }
    GESTURE_EVENTS.forEach((type) => window.addEventListener(type, onGesture, options));
    return stop;
  }, [soundPreference, media.url]);

  const toggleSound = () => {
    const next = !muted;
    setMuted(next);
    setSoundLabel(false);
    if (soundPreference) rememberSound(!next);
  };

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      video.pause();
      setPlaying(false);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) video.play().catch(() => setPlaying(false));
        else video.pause();
      },
      { threshold: 0.12 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [media.url]);

  return (
    <div className={`cinematic-video ${className}`}>
      <video
        ref={ref}
        poster={poster}
        autoPlay
        muted={muted}
        loop
        playsInline
        preload="metadata"
        aria-label={label}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      >
        <source src={media.url} type="video/webm" />
        {media.fallback && <source src={media.fallback} type="video/mp4" />}
      </video>
      {controls && (
        <div className="video-controls">
          <Button
            variant="film"
            size="icon"
            title={playing ? 'Pause video' : 'Play video'}
            aria-label={playing ? 'Pause video' : 'Play video'}
            onClick={() => {
              const video = ref.current;
              if (!video) return;
              if (video.paused) video.play().catch(() => setPlaying(false));
              else video.pause();
            }}
          >
            {playing ? <Pause /> : <Play />}
          </Button>
          <Button
            variant="film"
            size="icon"
            className={soundPreference ? `video-sound ${soundLabel && muted ? 'is-labelled' : ''}` : undefined}
            title={muted ? 'Unmute video' : 'Mute video'}
            aria-label={muted ? 'Unmute video' : 'Mute video'}
            onClick={toggleSound}
          >
            {muted ? <VolumeX /> : <Volume2 />}
            {soundPreference && (
              <span className="video-sound-label" aria-hidden="true">
                {touch ? 'Tap for sound' : 'Click for sound'}
              </span>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
