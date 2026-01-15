import { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasTriedAutoPlay = useRef(false);

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
        setIsPlaying(true);
        setHasUserInteracted(true);
      } catch (error) {
        // Auto-play was blocked by browser - this is expected
        console.log('Auto-play blocked, waiting for user interaction');
        setIsPlaying(false);
      }
    };

    attemptAutoPlay();
  }, [isLoaded, autoPlay]);

  // Play audio function
  const playAudio = useCallback(async () => {
    if (!audioRef.current || !isLoaded) return false;

    try {
      await audioRef.current.play();
      setIsPlaying(true);
      return true;
    } catch (error) {
      console.error('Play error:', error);
      return false;
    }
  }, [isLoaded]);

  // Pause audio function
  const pauseAudio = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setIsPlaying(false);
  }, []);

  // Handle user interaction to start audio (for browsers that block auto-play)
  useEffect(() => {
    if (hasUserInteracted || !isLoaded || !autoPlay) return;

    const handleFirstInteraction = async () => {
      if (hasUserInteracted) return;
      
      const success = await playAudio();
      if (success) {
        setHasUserInteracted(true);
        // Remove all listeners after successful play
        removeListeners();
      }
    };

    const removeListeners = () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
      document.removeEventListener('scroll', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };

    // Add interaction listeners
    document.addEventListener('click', handleFirstInteraction, { passive: true });
    document.addEventListener('touchstart', handleFirstInteraction, { passive: true });
    document.addEventListener('scroll', handleFirstInteraction, { passive: true, once: true });
    document.addEventListener('keydown', handleFirstInteraction, { once: true });

    return removeListeners;
  }, [hasUserInteracted, isLoaded, autoPlay, playAudio]);

  // Toggle audio on/off
  const toggleAudio = async () => {
    if (isPlaying) {
      pauseAudio();
    } else {
      const success = await playAudio();
      if (success) {
        setHasUserInteracted(true);
      }
    }
  };

  return (
    <button
      onClick={toggleAudio}
      disabled={!isLoaded}
      className={cn(
        "fixed bottom-6 right-6 z-50 p-3 rounded-full shadow-lg transition-all duration-300",
        "hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        isPlaying 
          ? "bg-primary text-primary-foreground" 
          : "bg-card text-foreground border border-border",
        !isLoaded && "opacity-50 cursor-not-allowed"
      )}
      aria-label={isPlaying ? `Mute ${label}` : `Play ${label}`}
      title={isPlaying ? `Mute ${label}` : `Play ${label}`}
    >
      {isPlaying ? (
        <Volume2 className="w-5 h-5" />
      ) : (
        <VolumeX className="w-5 h-5" />
      )}
      
      {/* Ripple animation when playing */}
      {isPlaying && (
        <>
          <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20" />
          <span className="absolute inset-0 rounded-full bg-primary animate-pulse opacity-10" />
        </>
      )}
    </button>
  );
};

export default AmbientSound;