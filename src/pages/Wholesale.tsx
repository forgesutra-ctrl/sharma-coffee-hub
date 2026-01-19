import WholesaleInquiryForm from '@/components/wholesale/WholesaleInquiryForm';
import { Card, CardContent } from '@/components/ui/card';
import { Package, Truck, BadgePercent, HeadphonesIcon, Clock, Shield } from 'lucide-react';

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
      {/* Hero Section */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-muted/50 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-primary text-sm font-medium tracking-[0.2em] uppercase mb-4">
              B2B Partnership
            </p>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-6">
              Wholesale Inquiries
            </h1>
            <p className="text-lg text-muted-foreground">
              Partner with Sharma Coffee Works for your café, restaurant, retail store, or corporate needs. 
              Enjoy premium Coorg coffee at competitive wholesale prices.
            </p>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-12 md:py-16 bg-secondary/30">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-center mb-10">
            Why Partner With Us?
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit) => (
              <Card key={benefit.title} className="bg-card/50 border-border/50">
                <CardContent className="p-6">
                  <benefit.icon className="w-10 h-10 text-primary mb-4" />
                  <h3 className="font-semibold text-lg mb-2">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Form Section */}
      <section className="py-12 md:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">
                Get in Touch
              </h2>
              <p className="text-muted-foreground">
                Fill out the form below and our wholesale team will contact you within 12 hours.
              </p>
            </div>
            
            <Card className="bg-card border-border/50">
              <CardContent className="p-6 md:p-8">
                <WholesaleInquiryForm />
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 md:py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-4xl md:text-5xl font-display font-bold mb-2">40+</p>
              <p className="text-sm opacity-80">Years of Excellence</p>
            </div>
            <div>
              <p className="text-4xl md:text-5xl font-display font-bold mb-2">22</p>
              <p className="text-sm opacity-80">Countries Served</p>
            </div>
            <div>
              <p className="text-4xl md:text-5xl font-display font-bold mb-2">500+</p>
              <p className="text-sm opacity-80">B2B Partners</p>
            </div>
            <div>
              <p className="text-4xl md:text-5xl font-display font-bold mb-2">100%</p>
              <p className="text-sm opacity-80">Coorg Origin</p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
