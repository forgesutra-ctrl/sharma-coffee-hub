import Layout from '@/components/coffee/Layout';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { processingContent, heritageContent } from '@/data/brandContent';
import coffeeSelectionImg from '@/assets/coffee-selection.jpg';
import coffeeRoastingImg from '@/assets/coffee-beans-roasting.jpg';

const processStages = [
  {
    id: 'selection',
    title: 'Selection',
    image: coffeeSelectionImg,
    content: `Coorg is well known worldwide for its fine coffee grown at sky kissing high altitudes. Only the finest quality and carefully cultivated clean coffees make their way into our roastery. The best quality beans from selective coffee plantations and curing works are used to extract its goodness to create delicate flavours in each stage of processing.`,
    highlights: [
      'Coffee grown at high altitudes in Coorg',
      'Only finest quality beans selected',
      'Sourced from selective coffee plantations',
      'Careful cultivation practices',
    ],
  },
  {
    id: 'roasting',
    title: 'Roasting',
    image: coffeeRoastingImg,
    content: `Nature's not in a hurry. A coffee plant takes 3 years to mature and then yields only a pound of coffee each year. With so much at stake, we use a slow roasting method to coax the best from every bean. Sharma Coffee's processing plant is located in Madikeri and Mysore equipped with best Indian made Bharat Roasters. Under the guidance of expert coffee roasters, exceptional coffee beans are roasted to bring optimum aroma, flavor and complexity. Furthermore, a roasting process involves drying, roasting, and cooling. Each of these techniques is handled delicately to bring out a culinary masterpiece.`,
    highlights: [
      'Slow roasting method for best results',
      'Bharat Roasters equipment',
      'Expert coffee roasters guidance',
      'Drying, roasting, and cooling process',
      'Optimum aroma, flavor and complexity',
    ],
    equipment: 'Bharat Roasters (Indian made)',
    locations: ['Madikeri', 'Mysore'],
  },
  {
    id: 'granulating',
    title: 'Granulating',
    image: coffeeRoastingImg,
    content: `After roasting, the beans are carefully granulated to the perfect consistency, ensuring optimal extraction during brewing. Our precision grinding process preserves the aromatic oils and flavors developed during roasting.`,
    highlights: [
      'Perfect consistency grinding',
      'Preserves aromatic oils',
      'Optimal extraction during brewing',
    ],
  },
  {
    id: 'blending',
    title: 'Chicory & Blending',
    image: coffeeSelectionImg,
    content: `Our signature blends combine premium coffee with carefully proportioned chicory to create the authentic South Indian filter coffee taste that our customers love. Each blend is crafted with precision, offering multiple chicory ratios to suit different preferences.`,
    highlights: [
      'Authentic South Indian taste',
      'Carefully proportioned blends',
      'Multiple chicory ratios available',
      'Premium quality chicory',
    ],
  },
  {
    id: 'packing',
    title: 'Packing',
    image: coffeeRoastingImg,
    content: `Each batch is carefully packed to preserve freshness, aroma, and flavor until it reaches our customers. Our packaging ensures that the coffee retains its quality from our facility to your cup.`,
    highlights: [
      'Freshness preserved',
      'Aroma protection',
      'Quality packaging materials',
      'From our facility to your cup',
    ],
  },
];

export default function Processing() {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative py-24 md:py-32 bg-gradient-to-b from-muted/50 to-background overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-10"
          style={{ backgroundImage: `url(${coffeeRoastingImg})` }}
        />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-primary text-sm font-medium tracking-[0.3em] uppercase mb-4">
              From Bean to Cup
            </p>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
              {processingContent.headline}
            </h1>
            <div className="section-divider mb-8" />
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              {processingContent.introduction}
            </p>
          </div>
        </div>
      </section>

      {/* Origin Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-primary text-sm font-medium tracking-[0.2em] uppercase mb-2">
                {heritageContent.location.subtitle}
              </p>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
                {heritageContent.location.title}
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>{heritageContent.location.description}</p>
                <p>{heritageContent.mythologicalOrigin.content}</p>
              </div>
              <div className="mt-8 p-6 bg-muted/50 rounded-lg border border-border">
                <h4 className="font-display text-lg font-semibold text-foreground mb-2">
                  Coorg Coffee Production
                </h4>
                <p className="text-muted-foreground text-sm">
                  {heritageContent.britishEra.content}
                </p>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-lg overflow-hidden image-shine">
                <img 
                  src={coffeeSelectionImg} 
                  alt="Coorg Coffee Plantations" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-primary text-primary-foreground p-6 rounded-lg shadow-xl">
                <div className="text-4xl font-display font-bold">40%</div>
                <div className="text-sm opacity-90">of Karnataka's Coffee Production</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Process Stages */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <p className="text-primary text-sm font-medium tracking-[0.2em] uppercase mb-2">
              Our Craft
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              The 5 Stages of Perfection
            </h2>
            <div className="section-divider" />
          </div>

          <div className="space-y-24">
            {processStages.map((stage, index) => (
              <div 
                key={stage.id} 
                className={`grid lg:grid-cols-2 gap-12 items-center ${
                  index % 2 === 1 ? 'lg:flex-row-reverse' : ''
                }`}
              >
                <div className={index % 2 === 1 ? 'lg:order-2' : ''}>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-display text-xl font-bold">
                      {index + 1}
                    </div>
                    <h3 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                      {stage.title}
                    </h3>
                  </div>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    {stage.content}
                  </p>
                  <ul className="space-y-3">
                    {stage.highlights.map((highlight, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-foreground">{highlight}</span>
                      </li>
                    ))}
                  </ul>
                  {stage.equipment && (
                    <div className="mt-6 p-4 bg-card border border-border rounded-lg">
                      <p className="text-sm">
                        <span className="text-muted-foreground">Equipment: </span>
                        <span className="text-primary font-medium">{stage.equipment}</span>
                      </p>
                      {stage.locations && (
                        <p className="text-sm mt-1">
                          <span className="text-muted-foreground">Facilities: </span>
                          <span className="text-foreground">{stage.locations.join(' & ')}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className={index % 2 === 1 ? 'lg:order-1' : ''}>
                  <div className="aspect-square rounded-lg overflow-hidden image-shine">
                    <img 
                      src={stage.image} 
                      alt={stage.title} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quality Promise */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-primary text-sm font-medium tracking-[0.2em] uppercase mb-2">
              Our Promise
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
              Quality at Every Step
            </h2>
            <div className="section-divider mb-8" />
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
              From the moment our beans are selected from the finest Coorg estates to the final 
              packaging, every step is handled with care and expertise. Our commitment to quality 
              ensures that every cup of Sharma Coffee delivers the authentic taste of South Indian 
              filter coffee tradition.
            </p>
            <div className="grid sm:grid-cols-3 gap-6">
              <div className="p-6 bg-card border border-border rounded-lg">
                <div className="text-4xl font-display font-bold text-primary mb-2">100%</div>
                <p className="text-sm text-muted-foreground">Premium Coorg Beans</p>
              </div>
              <div className="p-6 bg-card border border-border rounded-lg">
                <div className="text-4xl font-display font-bold text-primary mb-2">40+</div>
                <p className="text-sm text-muted-foreground">Years of Expertise</p>
              </div>
              <div className="p-6 bg-card border border-border rounded-lg">
                <div className="text-4xl font-display font-bold text-primary mb-2">22</div>
                <p className="text-sm text-muted-foreground">Countries Served</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Experience the Difference
          </h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Taste the result of our meticulous processing. From Coorg's finest beans to your cup.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/shop">
              <Button size="lg" variant="secondary" className="font-semibold">
                Shop Our Coffee
              </Button>
            </Link>
            <Link to="/brewing-guide">
              <Button size="lg" variant="outline" className="font-semibold border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                Learn to Brew
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
