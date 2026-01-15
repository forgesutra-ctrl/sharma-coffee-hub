import { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AmbientSoundProps {
  audioSrc: string;
  label?: string;
}

export default function AmbientSound({ audioSrc, label = 'Ambient Sound' }: AmbientSoundProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = 0.3;
    audio.loop = true;

    if (isPlaying && hasInteracted) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.log('Audio playback prevented:', error);
          setIsPlaying(false);
        });
      }
    } else {
      audio.pause();
    }
  }, [isPlaying, hasInteracted]);

  const toggleSound = () => {
    setHasInteracted(true);
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <button
        onClick={toggleSound}
        className={cn(
          "group relative flex items-center gap-3 px-4 py-3 rounded-full shadow-lg transition-all duration-300",
          "bg-background/95 backdrop-blur-sm border border-border/50",
          "hover:shadow-xl hover:scale-105",
          isPlaying && "bg-primary/10 border-primary/30"
        )}
        aria-label={isPlaying ? 'Mute sound' : 'Play sound'}
      >
        {isPlaying ? (
          <Volume2 className="w-5 h-5 text-primary animate-pulse" />
        ) : (
          <VolumeX className="w-5 h-5 text-muted-foreground" />
        )}

        <span className={cn(
          "text-sm font-medium whitespace-nowrap transition-all duration-300",
          "max-w-0 opacity-0 overflow-hidden",
          "group-hover:max-w-[200px] group-hover:opacity-100",
          isPlaying ? "text-primary" : "text-muted-foreground"
        )}>
          {label}
        </span>
      </button>

      <audio ref={audioRef} src={audioSrc} preload="auto" />
    </div>
  );
}
