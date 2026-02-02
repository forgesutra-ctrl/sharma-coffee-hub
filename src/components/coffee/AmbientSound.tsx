import { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface AmbientSoundProps {
  audioSrc: string;
  /** Fallback URL if primary fails (e.g. production serves from public path). */
  fallbackSrc?: string;
  label?: string;
  volume?: number;
  autoPlay?: boolean;
}

const DEFAULT_AUDIO_PATH = '/audio/coffee-pour.mp3';

/** Returns a URL that looks like an actual audio path (not base URL or empty). */
function normalizeAudioSrc(src: string | undefined): string {
  if (typeof src !== 'string' || !src.trim()) return DEFAULT_AUDIO_PATH;
  const s = src.trim();
  if (s.endsWith('/') || s === window.location?.origin || s === '') return DEFAULT_AUDIO_PATH;
  return s;
}

const AmbientSound = ({
  audioSrc,
  fallbackSrc,
  label = 'Ambient Sound',
  volume = 0.3,
  autoPlay = false
}: AmbientSoundProps) => {
  const effectiveSrc = normalizeAudioSrc(audioSrc);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(effectiveSrc);
  /** When true, user has turned sound off; otherwise sound is on (plays once by default). */
  const [userMuted, setUserMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const triedFallbackRef = useRef(false);

  useEffect(() => {
    setCurrentSrc(effectiveSrc);
    triedFallbackRef.current = false;
  }, [effectiveSrc]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = volume;
  }, [volume]);

  const onCanPlayThrough = () => {
    setIsLoaded(true);
    setHasError(false);
    if (autoPlay && !userMuted && audioRef.current) {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const onEnded = () => setIsPlaying(false);

  const onError = () => {
    if (fallbackSrc && !triedFallbackRef.current) {
      triedFallbackRef.current = true;
      setCurrentSrc(normalizeAudioSrc(fallbackSrc));
      return;
    }
    setHasError(true);
    setIsLoaded(false);
  };

  if (hasError) {
    return null;
  }

  const toggleMute = () => {
    const el = audioRef.current;
    if (!el || !isLoaded) return;

    if (isPlaying) {
      setUserMuted(true);
      el.pause();
      setIsPlaying(false);
    } else {
      setUserMuted(false);
      el.muted = false;
      el.currentTime = 0;
      const p = el.play();
      p.then(() => setIsPlaying(true)).catch(() => setHasError(true));
    }
  };

  const showAsPlaying = isPlaying;

  return (
    <>
      <audio
        ref={audioRef}
        src={currentSrc}
        preload="auto"
        loop={false}
        onCanPlayThrough={onCanPlayThrough}
        onEnded={onEnded}
        onError={onError}
        style={{ display: 'none' }}
        aria-hidden
      />
      {isLoaded && (
      <button
        type="button"
        onClick={toggleMute}
        className="fixed bottom-6 left-6 z-[100] p-3 bg-card/80 backdrop-blur-sm border border-border rounded-full shadow-lg hover:bg-card transition-colors"
        aria-label={showAsPlaying ? `Turn off ${label}` : `Play ${label}`}
        title={showAsPlaying ? `Turn off ${label}` : `Click to play ${label}`}
      >
        {showAsPlaying ? (
          <Volume2 className="w-5 h-5 text-primary" />
        ) : (
          <VolumeX className="w-5 h-5 text-muted-foreground" aria-hidden />
        )}
      </button>
      )}
    </>
  );
};

export default AmbientSound;
