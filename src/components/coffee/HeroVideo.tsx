import { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play, Pause, Volume2, VolumeX, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeroVideoProps {
  videoSrc?: string;
  posterImage?: string;
  title: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  overlayOpacity?: number;
  height?: 'full' | 'large' | 'medium';
}

export default function HeroVideo({
  videoSrc,
  posterImage,
  title,
  subtitle,
  ctaText = 'Shop Now',
  ctaLink = '/shop',
  secondaryCtaText,
  secondaryCtaLink,
  overlayOpacity = 60,
  height = 'full',
}: HeroVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        setIsPlaying(false);
      });
    }
  }, []);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const heightClasses = {
    full: 'min-h-screen',
    large: 'min-h-[85vh]',
    medium: 'min-h-[65vh]',
  };

  return (
    <section className={cn('relative w-full flex items-center justify-center overflow-hidden', heightClasses[height])}>
      {/* Video/Image Background */}
      {videoSrc ? (
        <video
          ref={videoRef}
          className={cn(
            'absolute inset-0 w-full h-full object-cover transition-opacity duration-1000',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
          src={videoSrc}
          poster={posterImage}
          autoPlay
          muted
          loop
          playsInline
          onLoadedData={() => setIsLoaded(true)}
        />
      ) : null}
      
      {/* Poster/Fallback Image */}
      <img
        src={posterImage}
        alt={title}
        className={cn(
          'absolute inset-0 w-full h-full object-cover transition-opacity duration-700',
          videoSrc && isLoaded ? 'opacity-0' : 'opacity-100'
        )}
      />

      {/* Overlay */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/40 to-background"
        style={{ opacity: overlayOpacity / 100 }}
      />

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
        <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-foreground mb-6 fade-in-up tracking-wide text-glow">
          {title}
        </h1>
        {subtitle && (
          <p className="text-lg sm:text-xl md:text-2xl text-foreground/80 mb-12 fade-in-up delay-200 font-light tracking-[0.2em] uppercase">
            {subtitle}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-4 justify-center fade-in-up delay-400">
          <Link 
            to={ctaLink} 
            className="btn-premium-solid inline-flex items-center justify-center gap-3 group"
          >
            {ctaText}
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
          {secondaryCtaText && secondaryCtaLink && (
            <Link to={secondaryCtaLink} className="btn-premium">
              {secondaryCtaText}
            </Link>
          )}
        </div>
      </div>

      {/* Video Controls */}
      {videoSrc && (
        <div className="absolute bottom-8 right-8 z-20 flex gap-2">
          <button
            onClick={togglePlay}
            className="p-3 bg-background/30 backdrop-blur-sm hover:bg-background/50 transition-all duration-300 rounded-sm border border-foreground/10"
            aria-label={isPlaying ? 'Pause video' : 'Play video'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={toggleMute}
            className="p-3 bg-background/30 backdrop-blur-sm hover:bg-background/50 transition-all duration-300 rounded-sm border border-foreground/10"
            aria-label={isMuted ? 'Unmute video' : 'Mute video'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      )}

      {/* Scroll Indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20">
        <div className="w-7 h-12 border-2 border-foreground/30 rounded-full flex justify-center p-2">
          <div className="w-1.5 h-3 bg-primary rounded-full animate-bounce" />
        </div>
      </div>
    </section>
  );
}
