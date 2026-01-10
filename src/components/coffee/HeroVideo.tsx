import { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play, Pause, Volume2, VolumeX, ArrowRight, ChevronDown } from 'lucide-react';
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
  showScrollIndicator?: boolean;
  centered?: boolean;
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
  overlayOpacity = 50,
  height = 'full',
  showScrollIndicator = true,
  centered = true,
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

  const scrollToContent = () => {
    window.scrollTo({
      top: window.innerHeight - 100,
      behavior: 'smooth',
    });
  };

  const heightClasses = {
    full: 'min-h-screen',
    large: 'min-h-[90vh]',
    medium: 'min-h-[70vh]',
  };

  return (
    <section className={cn('relative w-full flex items-center justify-center overflow-hidden bg-background', heightClasses[height])}>
      {/* Video Background */}
      {videoSrc && (
        <video
          ref={videoRef}
          className={cn(
            'absolute inset-0 w-full h-full object-cover transition-opacity duration-700',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
          src={videoSrc}
          autoPlay
          muted
          loop
          playsInline
          onLoadedData={() => setIsLoaded(true)}
        />
      )}

      {/* Gradient Overlay */}
      <div className="hero-overlay" />

      {/* Content */}
      <div className={cn(
        'relative z-10 px-6 max-w-5xl mx-auto',
        centered ? 'text-center' : 'text-left'
      )}>
        {/* Title */}
        <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-bold text-foreground mb-6 fade-in-up tracking-[0.02em] text-glow leading-[0.9]">
          {title}
        </h1>

        {/* Subtitle */}
        {subtitle && (
          <p className="text-lg sm:text-xl md:text-2xl text-foreground/70 mb-14 fade-in-up delay-300 font-light tracking-[0.3em] uppercase">
            {subtitle}
          </p>
        )}

        {/* CTAs */}
        <div className={cn(
          'flex flex-col sm:flex-row gap-5 fade-in-up delay-500',
          centered ? 'justify-center' : 'justify-start'
        )}>
          <Link 
            to={ctaLink} 
            className="btn-premium-solid inline-flex items-center justify-center gap-3 group"
          >
            <span>{ctaText}</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
          
          {secondaryCtaText && secondaryCtaLink && (
            <Link to={secondaryCtaLink} className="btn-premium">
              <span>{secondaryCtaText}</span>
            </Link>
          )}
        </div>
      </div>

      {/* Video Controls */}
      {videoSrc && (
        <div className="absolute bottom-8 right-8 z-20 flex gap-3">
          <button
            onClick={togglePlay}
            className="p-3 glass-dark rounded-sm hover:bg-foreground/10 transition-all duration-300"
            aria-label={isPlaying ? 'Pause video' : 'Play video'}
          >
            {isPlaying ? <Pause className="w-4 h-4 text-foreground/80" /> : <Play className="w-4 h-4 text-foreground/80" />}
          </button>
          <button
            onClick={toggleMute}
            className="p-3 glass-dark rounded-sm hover:bg-foreground/10 transition-all duration-300"
            aria-label={isMuted ? 'Unmute video' : 'Mute video'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-foreground/80" /> : <Volume2 className="w-4 h-4 text-foreground/80" />}
          </button>
        </div>
      )}

      {/* Scroll Indicator */}
      {showScrollIndicator && (
        <button 
          onClick={scrollToContent}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 group cursor-pointer"
          aria-label="Scroll to content"
        >
          <div className="flex flex-col items-center gap-3 text-foreground/50 hover:text-primary transition-colors duration-300">
            <span className="text-xs uppercase tracking-[0.3em] font-medium">Scroll</span>
            <div className="w-8 h-14 border-2 border-current rounded-full flex justify-center pt-3 group-hover:border-primary transition-colors duration-300">
              <ChevronDown className="w-4 h-4 animate-bounce" />
            </div>
          </div>
        </button>
      )}
    </section>
  );
}