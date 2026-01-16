import { useState, useEffect, useRef } from 'react';
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
  volume = 0.4,
  autoPlay = true 
}: AmbientSoundProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasTriedAutoPlay = useRef(false);
  const hasUserInteracted = useRef(false);

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio();
    audio.src = audioSrc;
    audio.loop = true;
    audio.volume = volume;
    audio.preload = 'auto';
    
    audio.addEventListener('canplaythrough', () => {
      setIsLoaded(true);
    });

    audio.addEventListener('play', () => {
      setIsPlaying(true);
    });

    audio.addEventListener('pause', () => {
      setIsPlaying(false);
    });

    audio.addEventListener('error', (e) => {
      console.error('Audio loading error:', e);
    });

    audioRef.current = audio;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, [audioSrc, volume]);

  // Attempt auto-play when loaded
  useEffect(() => {
    if (!isLoaded || !autoPlay || hasTriedAutoPlay.current) return;
    
    hasTriedAutoPlay.current = true;

    const attemptAutoPlay = async () => {
      if (!audioRef.current) return;

      try {
        await audioRef.current.play();
        hasUserInteracted.current = true;
      } catch (error) {
        console.log('Auto-play blocked, waiting for user interaction');
      }
    };

    attemptAutoPlay();
  }, [isLoaded, autoPlay]);

  // Handle first user interaction to start audio
  useEffect(() => {
    if (hasUserInteracted.current || !isLoaded || !autoPlay) return;

    const startAudioOnInteraction = async () => {
      if (audioRef.current && !hasUserInteracted.current) {
        try {
          await audioRef.current.play();
          hasUserInteracted.current = true;
        } catch (error) {
          console.error('Play error:', error);
        }
      }
    };

    const events = ['click', 'touchstart', 'scroll', 'keydown'];
    
    events.forEach(event => {
      document.addEventListener(event, startAudioOnInteraction, { 
        once: true, 
        passive: true 
      });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, startAudioOnInteraction);
      });
    };
  }, [isLoaded, autoPlay]);

  // Toggle audio on/off
  const toggleAudio = async () => {
    if (!audioRef.current || !isLoaded) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        await audioRef.current.play();
        hasUserInteracted.current = true;
      }
    } catch (error) {
      console.error('Toggle error:', error);
    }
  };

  return (
    <button
      onClick={toggleAudio}
      disabled={!isLoaded}
      className={`
        fixed bottom-6 right-6 z-50 p-3 rounded-full shadow-lg 
        transition-all duration-300 hover:scale-110 
        focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
        ${isPlaying 
          ? 'bg-primary text-primary-foreground' 
          : 'bg-card text-foreground border border-border hover:bg-muted'
        }
        ${!isLoaded ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      aria-label={isPlaying ? `Mute ${label}` : `Play ${label}`}
      title={isPlaying ? `Mute ${label}` : `Play ${label}`}
    >
      {isPlaying ? (
        <Volume2 className="w-5 h-5" />
      ) : (
        <VolumeX className="w-5 h-5" />
      )}
      
      {/* Pulse animation when playing */}
      {isPlaying && (
        <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-25" />
      )}
    </button>
  );
};

export default AmbientSound;