import { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface CoffeeAmbienceProps {
  audioSrc: string;
  volume?: number;
}

const CoffeeAmbience = ({ audioSrc, volume = 0.4 }: CoffeeAmbienceProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create audio element
    audioRef.current = new Audio(audioSrc);
    audioRef.current.loop = true;
    audioRef.current.volume = volume;

    // Try to auto-play
    const playPromise = audioRef.current.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
          setHasInteracted(true);
        })
        .catch(() => {
          // Auto-play was prevented, wait for user interaction
          setIsPlaying(false);
        });
    }

    // Cleanup
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [audioSrc, volume]);

  // Handle first user interaction to start audio
  useEffect(() => {
    if (hasInteracted) return;

    const startAudioOnInteraction = () => {
      if (audioRef.current && !hasInteracted) {
        audioRef.current.play()
          .then(() => {
            setIsPlaying(true);
            setHasInteracted(true);
          })
          .catch(console.error);
      }
    };

    // Listen for user interactions
    window.addEventListener('click', startAudioOnInteraction, { once: true });
    window.addEventListener('scroll', startAudioOnInteraction, { once: true });
    window.addEventListener('touchstart', startAudioOnInteraction, { once: true });
    window.addEventListener('keydown', startAudioOnInteraction, { once: true });

    return () => {
      window.removeEventListener('click', startAudioOnInteraction);
      window.removeEventListener('scroll', startAudioOnInteraction);
      window.removeEventListener('touchstart', startAudioOnInteraction);
      window.removeEventListener('keydown', startAudioOnInteraction);
    };
  }, [hasInteracted]);

  const toggleAudio = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
          setHasInteracted(true);
        })
        .catch(console.error);
    }
  };

  return (
    <button
      onClick={toggleAudio}
      className="fixed bottom-6 right-6 z-50 p-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-all duration-300 hover:scale-110"
      aria-label={isPlaying ? 'Mute coffee ambience' : 'Play coffee ambience'}
    >
      {isPlaying ? (
        <Volume2 className="w-5 h-5" />
      ) : (
        <VolumeX className="w-5 h-5" />
      )}
    </button>
  );
};

export default CoffeeAmbience;