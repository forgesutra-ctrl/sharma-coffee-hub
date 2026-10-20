import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { processingContent, heritageContent } from '@/data/brandContent';
import coffeeSelectionImg from '@/assets/coffee-selection.jpg';
import coffeeRoastingImg from '@/assets/coffee-beans-roasting.jpg';
import '@/components/home-v2/home-v2.css';

// The Slow Ritual, built from the shared inner-page vocabulary in home-v2.css.

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
    <div className="home-v2 page">
      {/* Hero Section */}
      <section>
        <div className="page-intro section-inner">
          <p className="eyebrow">From Bean to Cup</p>
          <h1>{processingContent.headline}</h1>
          <p className="page-lede">{processingContent.introduction}</p>
        </div>
      </section>

      {/* Origin Section */}
      <section className="page-section">
        <div className="page-split section-inner">
          <div>
            <p className="eyebrow">{heritageContent.location.subtitle}</p>
            <h2 className="page-heading">{heritageContent.location.title}</h2>
            <div className="page-copy">
              <p>{heritageContent.location.description}</p>
              <p>{heritageContent.mythologicalOrigin.content}</p>
            </div>
            <div className="page-item mt-8">
              <h3>Coorg Coffee Production</h3>
              <p>{heritageContent.britishEra.content}</p>
            </div>
          </div>
          <div className="page-split-media">
            <img src={coffeeSelectionImg} alt="Coorg Coffee Plantations" />
          </div>
        </div>
      </section>

      {/* Process Stages */}
      <section className="page-section page-section--tint">
        <div className="section-inner">
          <p className="eyebrow">Our Craft</p>
          <h2 className="page-heading">The 5 Stages of Perfection</h2>

          <div className="space-y-20">
            {processStages.map((stage, index) => (
              <div
                key={stage.id}
                className={`page-split ${index % 2 === 1 ? 'page-split--reverse' : ''}`}
              >
                <div>
                  <span className="page-list-marker">{String(index + 1).padStart(2, '0')}</span>
                  <h3 className="page-heading">{stage.title}</h3>
                  <div className="page-copy">
                    <p>{stage.content}</p>
                  </div>
                  {/* Kept from the previous design: no equivalent in the vocabulary. */}
                  <ul className="space-y-3 mt-6">
                    {stage.highlights.map((highlight, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-foreground">{highlight}</span>
                      </li>
                    ))}
                  </ul>
                  {stage.equipment && (
                    <div className="page-credentials">
                      <span>Equipment: {stage.equipment}</span>
                      {stage.locations && <span>Facilities: {stage.locations.join(' & ')}</span>}
                    </div>
                  )}
                </div>
                <div className="page-split-media">
                  <img src={stage.image} alt={stage.title} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quality Promise */}
      <section className="page-section">
        <div className="section-inner">
          <p className="eyebrow">Our Promise</p>
          <h2 className="page-heading">Quality at Every Step</h2>
          <div className="page-copy">
            <p>
              From the moment our beans are selected from the finest Coorg estates to the final
              packaging, every step is handled with care and expertise. Our commitment to quality
              ensures that every cup of Sharma Coffee delivers the authentic taste of South Indian
              filter coffee tradition.
            </p>
          </div>
          <div className="page-credentials">
            <span><strong>100%</strong> Premium Coorg Beans</span>
            <span><strong>40+</strong> Years of Expertise</span>
            <span><strong>22</strong> Countries Served</span>
            <span><strong>40%</strong> of Karnataka's Coffee Production</span>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="page-band">
        <h2>Experience the Difference</h2>
        <p>Taste the result of our meticulous processing. From Coorg's finest beans to your cup.</p>
        <div className="page-band-actions">
          <Button asChild variant="hero"><Link to="/shop">Shop Our Coffee</Link></Button>
          <Button asChild variant="film"><Link to="/brewing-guide">Learn to Brew</Link></Button>
        </div>
      </section>
    </div>
  );
}
