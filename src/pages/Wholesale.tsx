import WholesaleInquiryForm from '@/components/wholesale/WholesaleInquiryForm';
import { Card, CardContent } from '@/components/ui/card';
import { Package, Truck, BadgePercent, HeadphonesIcon, Clock, Shield } from 'lucide-react';
import '@/components/home-v2/home-v2.css';

// Wholesale, built from the shared inner-page vocabulary in home-v2.css.

const benefits = [
  {
    icon: BadgePercent,
    title: 'Competitive Pricing',
    description: 'Special wholesale rates for bulk orders with tiered pricing based on volume.',
  },
  {
    icon: Package,
    title: 'Custom Packaging',
    description: 'Private labeling and custom packaging options available for larger orders.',
  },
  {
    icon: Truck,
    title: 'Pan-India Delivery',
    description: 'Reliable delivery across India with special rates for regular orders.',
  },
  {
    icon: Clock,
    title: 'Fresh Roasted',
    description: 'Coffee roasted fresh for each order to ensure maximum freshness.',
  },
  {
    icon: Shield,
    title: 'Quality Assured',
    description: 'Consistent quality backed by 40+ years of coffee roasting expertise.',
  },
  {
    icon: HeadphonesIcon,
    title: 'Dedicated Support',
    description: 'Personal account manager for wholesale partners with priority support.',
  },
];

export default function Wholesale() {
  return (
    <div className="home-v2 page">
      {/* Hero Section */}
      <section>
        <div className="page-intro section-inner">
          <p className="eyebrow">B2B Partnership</p>
          <h1>Wholesale Inquiries</h1>
          <p className="page-lede">
            Partner with Sharma Coffee Works for your café, restaurant, retail store, or corporate needs.
            Enjoy premium Coorg coffee at competitive wholesale prices.
          </p>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="page-section page-section--tint">
        <div className="section-inner">
          <h2 className="page-heading">Why Partner With Us?</h2>
          <div className="page-grid page-grid--3">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="page-item">
                <benefit.icon />
                <h3>{benefit.title}</h3>
                <p>{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Form Section */}
      <section className="page-section">
        <div className="section-inner">
          <h2 className="page-heading">Get in Touch</h2>
          <div className="page-copy">
            <p>Fill out the form below and our wholesale team will contact you within 12 hours.</p>
          </div>

          {/* Kept from the previous design: forms are not in the vocabulary yet. */}
          <Card className="bg-card border-border/50 max-w-3xl mt-10">
            <CardContent className="p-6 md:p-8">
              <WholesaleInquiryForm />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Stats Section */}
      <section className="page-band">
        <div className="page-credentials">
          <span><strong>40+</strong> Years of Excellence</span>
          <span><strong>22</strong> Countries Served</span>
          <span><strong>500+</strong> B2B Partners</span>
          <span><strong>100%</strong> Coorg Origin</span>
        </div>
      </section>
    </div>
  );
}
