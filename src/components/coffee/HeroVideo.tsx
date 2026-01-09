import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Volume2, VolumeX, Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeroVideoProps {
  videoSrc?: string;
  posterSrc?: string;
  fallbackImageSrc: string;
  title: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
  secondaryCta?: {
    text: string;
    link: string;
  };
  overlayOpacity?: number;
  height?: 'full' | 'large' | 'medium';
}

const HeroVideo: React.FC<HeroVideoProps> = ({
  videoSrc,
  posterSrc,
  fallbackImageSrc,
  title,
  subtitle,
  ctaText = 'Shop Now',
  ctaLink = '/shop',
  secondaryCta,
  overlayOpacity = 50,
  height = 'full',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    if (videoRef.current && videoSrc) {
      videoRef.current.play().catch(() => {
        // Autoplay was prevented
        setIsPlaying(false);
      });
    }
  }, [videoSrc]);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

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

  const heightClasses = {
    full: 'h-screen',
    large: 'h-[80vh]',
    medium: 'h-[60vh]',
  };

  return (
    <section className={cn(
      "relative flex items-center justify-center overflow-hidden",
      heightClasses[height],
      "min-h-[500px]"
    )}>
      {/* Video/Image Background */}
      <div className="absolute inset-0">
        {videoSrc && !videoError ? (
          <video
            ref={videoRef}
            src={videoSrc}
            poster={posterSrc || fallbackImageSrc}
            muted={isMuted}
            loop
            playsInline
            autoPlay
            onLoadedData={() => setVideoLoaded(true)}
            onError={() => setVideoError(true)}
            className={cn(
              "w-full h-full object-cover transition-opacity duration-700",
              videoLoaded ? 'opacity-100' : 'opacity-0'
            )}
          />
        ) : null}

        {/* Fallback/Poster Image */}
        <img
          src={posterSrc || fallbackImageSrc}
          alt={title}
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-opacity duration-700",
            videoSrc && videoLoaded && !videoError ? 'opacity-0' : 'opacity-100'
          )}
        />

        {/* Overlay Gradient */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/70"
          style={{ opacity: overlayOpacity / 100 }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center max-w-4xl mx-auto px-4">
        <h1 className="font-serif text-5xl sm:text-6xl lg:text-8xl text-cream mb-6 animate-fade-in text-shadow">
          {title}
        </h1>

        {subtitle && (
          <p
            className="text-xl sm:text-2xl text-cream/90 mb-10 font-light tracking-wide animate-fade-in"
            style={{ animationDelay: '0.2s' }}
          >
            {subtitle}
          </p>
        )}

        <div
          className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in"
          style={{ animationDelay: '0.4s' }}
        >
          <Link
            to={ctaLink}
            className="btn-gold px-10 py-4 inline-flex items-center justify-center gap-2 hover:scale-105 transition-transform"
          >
            {ctaText}
            <ArrowRight className="w-5 h-5" />
          </Link>

          {secondaryCta && (
            <Link
              to={secondaryCta.link}
              className="btn-outline-gold px-10 py-4 inline-flex items-center justify-center gap-2 hover:scale-105 transition-transform"
            >
              {secondaryCta.text}
            </Link>
          )}
        </div>
      </div>

      {/* Video Controls */}
      {videoSrc && !videoError && (
        <div className="absolute bottom-8 right-8 flex gap-2 z-20">
          <button
            onClick={togglePlay}
            className="w-12 h-12 flex items-center justify-center bg-black/50 hover:bg-black/70 text-cream rounded-full backdrop-blur-sm transition-all"
            aria-label={isPlaying ? 'Pause video' : 'Play video'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={toggleMute}
            className="w-12 h-12 flex items-center justify-center bg-black/50 hover:bg-black/70 text-cream rounded-full backdrop-blur-sm transition-all"
            aria-label={isMuted ? 'Unmute video' : 'Mute video'}
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </button>
        </div>
      )}

      {/* Scroll Indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce z-10">
        <div className="w-6 h-10 border-2 border-cream/50 rounded-full flex items-start justify-center p-2">
          <div className="w-1 h-3 bg-cream/50 rounded-full" />
        </div>
      </div>
    </section>
  );
};

export default HeroVideo;
