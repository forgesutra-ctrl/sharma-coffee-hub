import Layout from '@/components/coffee/Layout';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Coffee, Leaf, Heart, Award } from 'lucide-react';

const values = [
  {
    icon: Coffee,
    title: 'Authentic Tradition',
    description: 'Preserving the time-honored South Indian coffee culture passed down through generations.',
  },
  {
    icon: Leaf,
    title: 'Sustainable Sourcing',
    description: 'Direct partnerships with farmers in the Western Ghats, ensuring fair trade and quality.',
  },
  {
    icon: Heart,
    title: 'Handcrafted Quality',
    description: 'Every batch is carefully roasted to bring out the perfect flavor profile.',
  },
  {
    icon: Award,
    title: 'Excellence',
    description: 'Committed to delivering the finest coffee experience to every customer.',
  },
];

const timeline = [
  { year: '1952', event: 'Our journey began with a small coffee stall in Chennai' },
  { year: '1978', event: 'Expanded to our first roasting facility in Coorg' },
  { year: '1995', event: 'Third generation takes over, modernizing while preserving tradition' },
  { year: '2015', event: 'Launched online to share our coffee with the world' },
  { year: '2024', event: 'Serving over 50,000 happy customers across India' },
];

export default function About() {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative py-24 md:py-32 bg-gradient-to-b from-muted/50 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
              Our Story
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              For over seven decades, Sharma Coffee has been crafting the perfect cup of South Indian filter coffee, 
              blending tradition with passion in every roast.
            </p>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
                From a Small Stall to Your Home
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  What started as a humble coffee stall in the bustling streets of Chennai in 1952 has grown into 
                  a beloved brand trusted by coffee lovers across India. Our founder, Shri Ramesh Sharma, had a 
                  simple dream: to share the authentic taste of South Indian filter coffee with everyone.
                </p>
                <p>
                  Three generations later, we continue to honor his vision. We source our beans directly from 
                  the lush estates of Coorg and Chikmagalur, where the Western Ghats provide the perfect climate 
                  for growing exceptional coffee.
                </p>
                <p>
                  Every batch is roasted in small quantities at our facility, where master roasters with decades 
                  of experience ensure each bean reaches its full potential. The result? A cup of coffee that 
                  captures the warmth and hospitality of South India.
                </p>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center">
                <Coffee className="w-32 h-32 text-primary/40" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground text-center mb-12">
            Our Values
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value) => (
              <div key={value.title} className="text-center p-6">
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
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground text-center mb-12">
            Our Journey
          </h2>
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

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Taste the Tradition
          </h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Experience the authentic flavors of South Indian coffee, crafted with love and tradition.
          </p>
          <Link to="/shop">
            <Button size="lg" variant="secondary" className="font-semibold">
              Shop Now
            </Button>
          </Link>
        </div>
      </section>
    </Layout>
  );
}
