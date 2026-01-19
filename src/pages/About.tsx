import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Coffee, Leaf, Heart, Award, MapPin, Users, Globe } from 'lucide-react';
import { brandInfo, aboutContent, heritageContent } from '@/data/brandContent';
import coffeeSelectionImg from '@/assets/coffee-selection.jpg';
import foundersImg from '@/assets/chatgpt_image_jan_12,_2026,_10_25_34_am.jpeg';

const values = [
  {
    icon: Coffee,
    title: 'Authentic Tradition',
    description: 'Preserving the time-honored South Indian coffee culture passed down through generations since 1987.',
  },
  {
    icon: Leaf,
    title: 'Sustainable Sourcing',
    description: 'Direct partnerships with farmers in Coorg, ensuring quality beans and fair practices.',
  },
  {
    icon: Heart,
    title: 'Handcrafted Quality',
    description: 'Every batch is carefully roasted using Bharat Roasters to bring out the perfect flavor profile.',
  },
  {
    icon: Award,
    title: 'Excellence',
    description: 'Committed to delivering the finest coffee experience with a 4.8-star rating.',
  },
];

const timeline = [
  { year: '1600 AD', event: 'Sufi saint Bababudan brings coffee seeds to the Chandragiri hills of Chikmagalur' },
  { year: '19th Century', event: 'British establish large-scale coffee plantations in Coorg' },
  { year: '1987', event: 'Sri Sridhar V. establishes Sharma Coffee in Madikeri, Coorg' },
  { year: '2020', event: 'Varun Sharma joins the family business, expanding into new products' },
  { year: 'Today', event: 'Serving customers across 22 countries with premium Coorg coffee' },
];

export default function About() {
  return (
      {/* Hero Section */}
      <section className="relative py-24 md:py-32 bg-gradient-to-b from-muted/50 to-background overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-10"
          style={{ backgroundImage: `url(${coffeeSelectionImg})` }}
        />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-primary text-sm font-medium tracking-[0.3em] uppercase mb-4">
              {aboutContent.headline}
            </p>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
              Our Story
            </h1>
            <div className="section-divider mb-8" />
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              With a legacy spanning nearly 40 years, {brandInfo.name} is a premium coffee roaster 
              deeply rooted in South Indian traditions. {brandInfo.tagline} {brandInfo.establishedText}.
            </p>
          </div>
        </div>
      </section>

      {/* Introduction Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
                The Taste of Coorg
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>{aboutContent.introduction}</p>
                <p>{aboutContent.retailStoreDescription}</p>
                <p>{aboutContent.manufacturingDescription}</p>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-lg overflow-hidden image-shine">
                <img 
                  src={coffeeSelectionImg} 
                  alt="Coorg Coffee Selection" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-primary text-primary-foreground p-6 rounded-lg shadow-xl">
                <div className="text-4xl font-display font-bold">40+</div>
                <div className="text-sm opacity-90">Years of Excellence</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Founder Story Section */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="lg:order-2">
              <p className="text-primary text-sm font-medium tracking-[0.2em] uppercase mb-2">
                {aboutContent.preSharmaStory.title}
              </p>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
                {aboutContent.founder.title}: {aboutContent.founder.name}
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>{aboutContent.preSharmaStory.content}</p>
                <p>{aboutContent.founder.content}</p>
              </div>
            </div>
            <div className="lg:order-1 relative">
              <div className="aspect-square rounded-lg overflow-hidden image-shine">
                <img
                  src={foundersImg}
                  alt="Sharma Coffee Founders - Building a Legacy Together"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -right-6 bg-card border border-border p-6 rounded-lg shadow-xl">
                <div className="text-4xl font-display font-bold text-primary">{aboutContent.founder.year}</div>
                <div className="text-sm text-muted-foreground">Founded in Madikeri</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Achievers Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-primary text-sm font-medium tracking-[0.2em] uppercase mb-2">
              {aboutContent.achievers.title}
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
              {aboutContent.achievers.name}
            </h2>
            <div className="text-muted-foreground space-y-4">
              <p>{aboutContent.achievers.content}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid sm:grid-cols-3 gap-8 mt-16 max-w-4xl mx-auto">
            <div className="text-center p-6 bg-card rounded-lg border border-border">
              <Globe className="w-10 h-10 text-primary mx-auto mb-4" />
              <div className="text-3xl font-display font-bold text-foreground mb-2">22</div>
              <div className="text-sm text-muted-foreground">Countries Served</div>
            </div>
            <div className="text-center p-6 bg-card rounded-lg border border-border">
              <MapPin className="w-10 h-10 text-primary mx-auto mb-4" />
              <div className="text-3xl font-display font-bold text-foreground mb-2">2</div>
              <div className="text-sm text-muted-foreground">Locations (Madikeri & Mysore)</div>
            </div>
            <div className="text-center p-6 bg-card rounded-lg border border-border">
              <Users className="w-10 h-10 text-primary mx-auto mb-4" />
              <div className="text-3xl font-display font-bold text-foreground mb-2">4.8</div>
              <div className="text-sm text-muted-foreground">Star Rating</div>
            </div>
          </div>
        </div>
      </section>

      {/* Heritage Section */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <p className="text-primary text-sm font-medium tracking-[0.2em] uppercase mb-2">
              {heritageContent.location.subtitle}
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              The Legend of Coffee in India
            </h2>
            <div className="section-divider mb-6" />
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="bg-card border border-border rounded-lg p-8 mb-8">
              <h3 className="font-display text-xl font-semibold text-foreground mb-4">
                {heritageContent.mythologicalOrigin.title}
              </h3>
              <p className="text-muted-foreground">
                {heritageContent.mythologicalOrigin.content}
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-8 mb-8">
              <h3 className="font-display text-xl font-semibold text-foreground mb-4">
                {heritageContent.britishEra.title}
              </h3>
              <p className="text-muted-foreground">
                {heritageContent.britishEra.content}
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-8">
              <h3 className="font-display text-xl font-semibold text-foreground mb-4">
                {heritageContent.sustainability.title}
              </h3>
              <p className="text-muted-foreground">
                {heritageContent.sustainability.content}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground text-center mb-4">
            Our Values
          </h2>
          <div className="section-divider mb-12" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value) => (
              <div key={value.title} className="text-center p-6 bg-card rounded-lg border border-border">
                <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                  <value.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                  {value.title}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground text-center mb-4">
            Our Journey
          </h2>
          <div className="section-divider mb-12" />
          <div className="max-w-2xl mx-auto">
            <div className="relative border-l-2 border-primary/30 pl-8 space-y-8">
              {timeline.map((item, index) => (
                <div key={item.year} className="relative">
                  <div className="absolute -left-[2.65rem] top-0 w-5 h-5 bg-primary rounded-full" />
                  <div className="text-primary font-display font-bold text-xl mb-1">
                    {item.year}
                  </div>
                  <p className="text-muted-foreground">{item.event}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Locations Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground text-center mb-4">
            Visit Us
          </h2>
          <div className="section-divider mb-12" />
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-card border border-border rounded-lg p-8">
              <MapPin className="w-10 h-10 text-primary mb-4" />
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                {brandInfo.locations.retailStore.name}
              </h3>
              <p className="text-sm text-primary mb-2">{brandInfo.locations.retailStore.nickname}</p>
              <p className="text-muted-foreground text-sm mb-4">
                {brandInfo.locations.retailStore.address}
              </p>
              <div className="text-sm text-muted-foreground">
                <p>{brandInfo.businessHours.weekdays}</p>
                <p>{brandInfo.businessHours.sunday}</p>
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg p-8">
              <MapPin className="w-10 h-10 text-primary mb-4" />
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                {brandInfo.locations.manufacturingUnit.name}
              </h3>
              <p className="text-sm text-primary mb-2">{brandInfo.locations.manufacturingUnit.cityNickname}</p>
              <p className="text-muted-foreground text-sm mb-4">
                {brandInfo.locations.manufacturingUnit.address}
              </p>
              <p className="text-sm text-muted-foreground">
                {brandInfo.locations.manufacturingUnit.description}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Taste the Tradition
          </h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Experience the authentic flavors of Coorg coffee, crafted with love and tradition since 1987.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/shop">
              <Button size="lg" variant="secondary" className="font-semibold">
                Shop Now
              </Button>
            </Link>
            <Link to="/contact">
              <Button size="lg" variant="outline" className="font-semibold border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
