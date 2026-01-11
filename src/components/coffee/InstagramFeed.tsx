import { useState } from 'react';
import { Instagram, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

// Placeholder Instagram posts (in production, these would come from Instagram API)
const instagramPosts = [
  {
    id: '1',
    image: 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=400',
    alt: 'Fresh coffee beans from Coorg',
    likes: 234,
  },
  {
    id: '2',
    image: 'https://images.pexels.com/photos/1695052/pexels-photo-1695052.jpeg?auto=compress&cs=tinysrgb&w=400',
    alt: 'Traditional filter coffee brewing',
    likes: 189,
  },
  {
    id: '3',
    image: 'https://images.pexels.com/photos/2074122/pexels-photo-2074122.jpeg?auto=compress&cs=tinysrgb&w=400',
    alt: 'Coffee plantation in misty Coorg',
    likes: 312,
  },
  {
    id: '4',
    image: 'https://images.pexels.com/photos/894695/pexels-photo-894695.jpeg?auto=compress&cs=tinysrgb&w=400',
    alt: 'Hot filter coffee with steam',
    likes: 256,
  },
  {
    id: '5',
    image: 'https://images.pexels.com/photos/1309778/pexels-photo-1309778.jpeg?auto=compress&cs=tinysrgb&w=400',
    alt: 'Coffee roasting process',
    likes: 198,
  },
  {
    id: '6',
    image: 'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg?auto=compress&cs=tinysrgb&w=400',
    alt: 'Customer enjoying filter coffee',
    likes: 275,
  },
];

interface InstagramFeedProps {
  className?: string;
}

export default function InstagramFeed({ className = '' }: InstagramFeedProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <section className={`py-16 md:py-20 bg-secondary/30 ${className}`}>
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Instagram className="w-8 h-8 text-primary" />
            <p className="text-primary text-sm font-medium tracking-[0.2em] uppercase">
              @sharmacoffeeworks
            </p>
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Follow Our Journey
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Join our coffee community on Instagram for brewing tips, behind-the-scenes 
            glimpses, and the latest from our Coorg estates.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
          {instagramPosts.map((post, index) => (
            <motion.a
              key={post.id}
              href="https://www.instagram.com/sharmacoffeeworks"
              target="_blank"
              rel="noopener noreferrer"
              className="relative aspect-square overflow-hidden group cursor-pointer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              onMouseEnter={() => setHoveredId(post.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <img
                src={post.image}
                alt={post.alt}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              
              {/* Overlay */}
              <div 
                className={`absolute inset-0 bg-background/80 flex items-center justify-center transition-opacity duration-300 ${
                  hoveredId === post.id ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <div className="text-center">
                  <Instagram className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="text-sm text-foreground font-medium">View on Instagram</p>
                </div>
              </div>
            </motion.a>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-10">
          <a
            href="https://www.instagram.com/sharmacoffeeworks"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium transition-colors group"
          >
            <Instagram className="w-5 h-5" />
            <span>Follow us on Instagram</span>
            <ExternalLink className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </a>
        </div>
      </div>
    </section>
  );
}
