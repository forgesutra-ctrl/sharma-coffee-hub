import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StorySectionProps {
  title: string;
  subtitle?: string;
  content: string[];
  ctaText?: string;
  ctaLink?: string;
  image: string;
  videoUrl?: string;
  layout?: 'left' | 'right';
  theme?: 'light' | 'dark';
  showFrame?: boolean;
}

const StorySection: React.FC<StorySectionProps> = ({
  title,
  subtitle,
  content,
  ctaText = 'Learn More',
  ctaLink = '/about',
  image,
  videoUrl,
  layout = 'left',
  theme = 'dark',
  showFrame = true,
}) => {
  return (
    <section className={cn(
      "py-20",
      theme === 'dark' ? 'bg-background' : 'bg-cream'
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={cn(
          "grid grid-cols-1 lg:grid-cols-2 gap-16 items-center",
          layout === 'right' && "lg:grid-flow-dense"
        )}>
          {/* Image */}
          <div className={cn(
            "relative",
            layout === 'right' && "lg:col-start-2"
          )}>
            <div className="aspect-[4/5] overflow-hidden relative group">
              <img
                src={image}
                alt={title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />

              {/* Video Play Button */}
              {videoUrl && (
                <a
                  href={videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <div className="w-20 h-20 rounded-full bg-gold flex items-center justify-center transform group-hover:scale-110 transition-transform">
                    <Play className="w-8 h-8 text-coffee-foreground ml-1" />
                  </div>
                </a>
              )}
            </div>

            {/* Decorative frame */}
            {showFrame && (
              <div className="absolute -bottom-6 -right-6 w-full h-full border-2 border-gold/30 -z-10" />
            )}
          </div>

          {/* Content */}
          <div className={cn(
            layout === 'right' ? "lg:pr-8" : "lg:pl-8"
          )}>
            {subtitle && (
              <span className="text-gold text-sm font-semibold tracking-widest uppercase">
                {subtitle}
              </span>
            )}
            <h2 className={cn(
              "font-serif text-4xl sm:text-5xl mt-4 mb-6",
              theme === 'dark' ? 'text-foreground' : 'text-coffee-foreground'
            )}>
              {title}
            </h2>

            {content.map((paragraph, index) => (
              <p
                key={index}
                className={cn(
                  "text-lg mb-6 leading-relaxed",
                  theme === 'dark' ? 'text-muted-foreground' : 'text-coffee-foreground/70'
                )}
              >
                {paragraph}
              </p>
            ))}

            {ctaLink && (
              <Link
                to={ctaLink}
                className="btn-outline-gold inline-flex items-center gap-2"
              >
                {ctaText}
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default StorySection;
