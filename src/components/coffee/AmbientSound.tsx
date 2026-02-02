import { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface AmbientSoundProps {
  audioSrc: string;
  label?: string;
  volume?: number;
  autoPlay?: boolean;
}

const AmbientSound = ({
  audioSrc,
  label = 'Ambient Sound',
  volume = 0.3,
  autoPlay = false
}: AmbientSoundProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  /** When true, user has turned sound off; otherwise sound is on (plays once by default). */
  const [userMuted, setUserMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio();

    audio.addEventListener('canplaythrough', () => {
      setIsLoaded(true);
      setHasError(false);
      if (autoPlay && !userMuted) {
        audio.play().then(() => setIsPlaying(true)).catch(() => {
          // Autoplay blocked by browser (common on production). Keep component visible so user can click to play.
        });
      }
    });

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
    });

    audio.addEventListener('error', () => {
      console.log('Audio file not available - ambient sound disabled');
      setHasError(true);
      setIsLoaded(false);
    });

    audio.src = audioSrc;
    audio.loop = false; // Play once only
    audio.volume = volume;
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [audioSrc, volume, autoPlay]);

  if (hasError) {
    return null;
  }

  const toggleMute = () => {
    if (!audioRef.current || !isLoaded) return;

    if (userMuted) {
      setUserMuted(false);
      audioRef.current.currentTime = 0;
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {
        setHasError(true);
      });
    } else {
      setUserMuted(true);
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  if (!isLoaded) {
    return null;
  }

  const soundOn = !userMuted;

  return (
    <button
      onClick={toggleMute}
      className="fixed bottom-6 right-6 z-40 p-3 bg-card/80 backdrop-blur-sm border border-border rounded-full shadow-lg hover:bg-card transition-colors"
      aria-label={soundOn ? `Turn off ${label}` : `Turn on ${label}`}
      title={soundOn ? `Turn off ${label}` : `Turn on ${label}`}
    >
      {soundOn ? (
        <Volume2 className="w-5 h-5 text-primary" />
      ) : (
        <VolumeX className="w-5 h-5 text-muted-foreground" />
      )}
    </button>
  );
};

export default AmbientSound;
