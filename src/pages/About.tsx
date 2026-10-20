import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Coffee, Leaf, Heart, Award, MapPin, Users, Globe } from 'lucide-react';
import { brandInfo, aboutContent, heritageContent } from '@/data/brandContent';
import coffeeSelectionImg from '@/assets/coffee-selection.jpg';
import foundersImg from '@/assets/chatgpt_image_jan_12,_2026,_10_25_34_am.jpeg';
import '@/components/home-v2/home-v2.css';

// Our Story, built from the shared inner-page vocabulary in home-v2.css (see "Inner
// pages"). Copy, images and section order are unchanged from the previous design.

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
    <div className="home-v2 page">
      {/* Hero Section */}
      <section>
        <div className="page-intro section-inner">
          <p className="eyebrow">{aboutContent.headline}</p>
          <h1>Our Story</h1>
          <p className="page-lede">
            With a legacy spanning nearly 40 years, {brandInfo.name} is a premium coffee roaster
            deeply rooted in South Indian traditions. {brandInfo.tagline} {brandInfo.establishedText}.
          </p>
        </div>
      </section>

      {/* Introduction Section */}
      <section className="page-section">
        <div className="page-split section-inner">
          <div>
            <h2 className="page-heading">The Taste of Coorg</h2>
            <div className="page-copy">
              <p>{aboutContent.introduction}</p>
              <p>{aboutContent.retailStoreDescription}</p>
              <p>{aboutContent.manufacturingDescription}</p>
            </div>
          </div>
          <div className="page-split-media">
            <img src={coffeeSelectionImg} alt="Coorg Coffee Selection" />
          </div>
        </div>
      </section>

      {/* Founder Story Section */}
      <section className="page-section page-section--tint">
        <div className="page-split page-split--reverse section-inner">
          <div>
            <p className="eyebrow">{aboutContent.preSharmaStory.title}</p>
            <h2 className="page-heading">
              {aboutContent.founder.title}: {aboutContent.founder.name}
            </h2>
            <div className="page-copy">
              <p>{aboutContent.preSharmaStory.content}</p>
              <p>{aboutContent.founder.content}</p>
            </div>
          </div>
          <div className="page-split-media">
            <img src={foundersImg} alt="Sharma Coffee Founders - Building a Legacy Together" />
          </div>
        </div>
      </section>

      {/* Achievers Section */}
      <section className="page-section">
        <div className="section-inner">
          <p className="eyebrow">{aboutContent.achievers.title}</p>
          <h2 className="page-heading">{aboutContent.achievers.name}</h2>
          <div className="page-copy">
            <p>{aboutContent.achievers.content}</p>
          </div>

          {/* Stats */}
          <div className="page-credentials">
            <span><Globe /> <strong>22</strong> Countries Served</span>
            <span><MapPin /> <strong>2</strong> Locations (Madikeri &amp; Mysore)</span>
            <span><Users /> <strong>4.8</strong> Star Rating</span>
          </div>
        </div>
      </section>

      {/* Heritage Section */}
      <section className="page-section page-section--tint">
        <div className="section-inner">
          <p className="eyebrow">{heritageContent.location.subtitle}</p>
          <h2 className="page-heading">The Legend of Coffee in India</h2>

          <div className="page-stack">
            <div className="page-item">
              <h3>{heritageContent.mythologicalOrigin.title}</h3>
              <p>{heritageContent.mythologicalOrigin.content}</p>
            </div>
            <div className="page-item">
              <h3>{heritageContent.britishEra.title}</h3>
              <p>{heritageContent.britishEra.content}</p>
            </div>
            <div className="page-item">
              <h3>{heritageContent.sustainability.title}</h3>
              <p>{heritageContent.sustainability.content}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="page-section">
        <div className="section-inner">
          <h2 className="page-heading">Our Values</h2>
          <div className="page-grid">
            {values.map((value) => (
              <div key={value.title} className="page-item">
                <value.icon />
                <h3>{value.title}</h3>
                <p>{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="page-section page-section--tint">
        <div className="section-inner">
          <h2 className="page-heading">Our Journey</h2>
          <ol className="page-list">
            {timeline.map((item) => (
              <li key={item.year}>
                <span className="page-list-marker">{item.year}</span>
                <p>{item.event}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Locations Section */}
      <section className="page-section">
        <div className="section-inner">
          <h2 className="page-heading">Visit Us</h2>
          <div className="page-split">
            <div className="page-item self-start">
              <MapPin />
              <h3>{brandInfo.locations.retailStore.name}</h3>
              <p className="eyebrow">{brandInfo.locations.retailStore.nickname}</p>
              <p>{brandInfo.locations.retailStore.address}</p>
              <p>{brandInfo.businessHours.weekdays}</p>
              <p>{brandInfo.businessHours.sunday}</p>
            </div>
            <div className="page-item self-start">
              <MapPin />
              <h3>{brandInfo.locations.manufacturingUnit.name}</h3>
              <p className="eyebrow">{brandInfo.locations.manufacturingUnit.cityNickname}</p>
              <p>{brandInfo.locations.manufacturingUnit.address}</p>
              <p>{brandInfo.locations.manufacturingUnit.description}</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="page-band">
        <h2>Taste the Tradition</h2>
        <p>Experience the authentic flavors of Coorg coffee, crafted with love and tradition since 1987.</p>
        <div className="page-band-actions">
          <Button asChild variant="hero"><Link to="/shop">Shop Now</Link></Button>
          <Button asChild variant="film"><Link to="/contact">Contact Us</Link></Button>
        </div>
      </section>
    </div>
  );
}
