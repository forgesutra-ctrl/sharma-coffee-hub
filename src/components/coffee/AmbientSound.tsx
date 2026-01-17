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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio();

    audio.addEventListener('canplaythrough', () => {
      setIsLoaded(true);
      setHasError(false);
    });

    audio.addEventListener('error', () => {
      console.log('Audio file not available - ambient sound disabled');
      setHasError(true);
      setIsLoaded(false);
    });

    audio.src = audioSrc;
    audio.loop = true;
    audio.volume = volume;
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [audioSrc, volume]);

  if (hasError) {
    return null;
  }

  const togglePlay = () => {
    if (!audioRef.current || !isLoaded) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {
        setHasError(true);
      });
    }
    setIsPlaying(!isPlaying);
  };

  if (!isLoaded) {
    return null;
  }

  return (
    <button
      onClick={togglePlay}
      className="fixed bottom-6 right-6 z-40 p-3 bg-card/80 backdrop-blur-sm border border-border rounded-full shadow-lg hover:bg-card transition-colors"
      aria-label={isPlaying ? `Pause ${label}` : `Play ${label}`}
      title={label}
    >
      {isPlaying ? (
        <Volume2 className="w-5 h-5 text-primary" />
      ) : (
        <VolumeX className="w-5 h-5 text-muted-foreground" />
      )}
    </button>
  );
};

export default AmbientSound;
