import { useEffect, useRef, useState } from 'react';
import { Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { MediaAsset } from '@/lib/site-media';

// Ported from the reference redesign. Plays only while at least 12% of the video is
// on screen, and stays paused for users who prefer reduced motion.
//
// The reference sets a single WebM `src`, which leaves Safari/iOS with a blank box.
// This emits WebM first and the MP4 fallback second, so each browser picks the first
// one it can play. Because the sources are children, swapping films needs a remount:
// give the component a `key` that changes with the film.
export function CinematicVideo({
  media,
  poster,
  className = '',
  label,
  controls = false,
}: {
  media: MediaAsset;
  poster: string;
  className?: string;
  label: string;
  controls?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);

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
            title={muted ? 'Unmute video' : 'Mute video'}
            aria-label={muted ? 'Unmute video' : 'Mute video'}
            onClick={() => setMuted(!muted)}
          >
            {muted ? <VolumeX /> : <Volume2 />}
          </Button>
        </div>
      )}
    </div>
  );
}
