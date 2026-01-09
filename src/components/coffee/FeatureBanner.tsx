import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

interface FeatureBannerProps {
  title: string;
  subtitle?: string;
  image: string;
  ctaText?: string;
  ctaLink?: string;
  align?: 'left' | 'center' | 'right';
  overlay?: 'light' | 'dark';
}

export default function FeatureBanner({
  title,
  subtitle,
  image,
  ctaText = 'Shop Now',
  ctaLink = '/shop',
  align = 'center',
  overlay = 'dark',
}: FeatureBannerProps) {
  const alignClasses = {
    left: 'text-left items-start',
    center: 'text-center items-center',
    right: 'text-right items-end',
  };

  return (
    <section className="relative h-[60vh] min-h-[400px] overflow-hidden">
      {/* Background Image */}
      <img
        src={image}
        alt={title}
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Overlay */}
      <div 
        className={`absolute inset-0 ${
          overlay === 'dark' 
            ? 'bg-gradient-to-r from-background/90 via-background/60 to-background/30' 
            : 'bg-gradient-to-b from-background/20 to-background/60'
        }`}
      />

      {/* Content */}
      <div className="relative z-10 h-full max-w-7xl mx-auto px-4 flex flex-col justify-center">
        <div className={`flex flex-col gap-4 max-w-xl ${alignClasses[align]}`}>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
            {title}
          </h2>
          
          {subtitle && (
            <p className="text-lg text-foreground/80 max-w-md">
              {subtitle}
            </p>
          )}

          <Link
            to={ctaLink}
            className="btn-premium-solid inline-flex items-center gap-3 group mt-4 w-fit"
          >
            <span>{ctaText}</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}