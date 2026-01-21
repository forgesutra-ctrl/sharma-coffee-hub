import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Instagram,
  Facebook,
  Twitter,
  MessageCircle,
} from 'lucide-react';
import { toast } from 'sonner';

const faqs = [
  {
    question: 'How long does shipping take?',
    answer:
      'We ship orders within 24–48 hours. Delivery typically takes 3–5 business days within India. International shipping timelines vary by destination.',
  },
  {
    question: 'Do you offer international shipping?',
    answer:
      'Yes, we ship internationally. Shipping charges and delivery timelines vary based on location and will be calculated at checkout.',
  },
  {
    question: "What's the best way to store coffee?",
    answer:
      'Store your coffee in an airtight container at room temperature, away from direct sunlight and heat. Avoid refrigerating as moisture can affect the flavor.',
  },
  {
    question: 'Can I return or exchange my order?',
    answer:
      "Due to the perishable nature of coffee, we don't accept returns. However, if you receive a damaged product, please contact us within 48 hours.",
  },
  {
    question: 'Do you offer wholesale pricing?',
    answer:
      'Yes! We offer special pricing for cafes, restaurants, and bulk orders. Please contact us at ask@sharmacoffeeworks.com for more information.',
  },
];

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulated submission
    await new Promise((resolve) => setTimeout(resolve, 1000));

    toast.success("Message sent! We'll get back to you soon.");
    setFormData({ name: '', email: '', subject: '', message: '' });
    setIsSubmitting(false);
  };

  return (
    <>
      {/* Hero Section */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-muted/50 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-6">
              Get in Touch
            </h1>
            <p className="text-lg text-muted-foreground">
              Have questions? We'd love to hear from you. Send us a message and
              we'll respond as soon as possible.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div>
              <h2 className="font-display text-2xl font-bold mb-6">
                Send us a Message
              </h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Your name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) =>
                      setFormData({ ...formData, subject: e.target.value })
                    }
                    placeholder="How can we help?"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                    placeholder="Your message..."
                    rows={5}
                    required
                  />
                </div>

                <Button type="submit" size="lg" disabled={isSubmitting}>
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                </Button>
              </form>
            </div>

            {/* Contact Info */}
            <div className="space-y-8">
              <h2 className="font-display text-2xl font-bold mb-6 text-primary">
                Contact Information
              </h2>

              {/* Contact Methods */}
              <div className="space-y-4">
                <Card className="bg-card border border-border">
                  <CardContent className="p-6">
                    <Phone className="w-8 h-8 text-primary mb-3" />
                    <h3 className="font-display text-lg font-semibold text-foreground mb-3">Phone</h3>
                    <div className="space-y-2 text-sm">
                      <p>
                        <a href="tel:+918762988145" className="text-primary hover:text-primary/80 font-semibold">
                          +91 8762 988 145
                        </a>
                        <span className="text-muted-foreground ml-2">(Primary)</span>
                      </p>
                      <p>
                        <a href="tel:+916363235357" className="text-foreground/80 hover:text-primary">
                          +91 6363 235 357
                        </a>
                        <span className="text-muted-foreground ml-2">(Secondary)</span>
                      </p>
                    </div>
                    <div className="mt-4 pt-4 border-t border-border">
                      <a 
                        href="https://wa.me/918762988145" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium"
                      >
                        <MessageCircle className="w-5 h-5" />
                        Chat on WhatsApp
                      </a>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border border-border">
                  <CardContent className="p-6">
                    <Mail className="w-8 h-8 text-primary mb-3" />
                    <h3 className="font-display text-lg font-semibold text-foreground mb-3">Email</h3>
                    <p className="text-sm">
                      <a href="mailto:ask@sharmacoffeeworks.com" className="text-primary hover:text-primary/80">
                        ask@sharmacoffeeworks.com
                      </a>
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Locations */}
              <div className="space-y-6">
                <h3 className="font-display text-xl font-semibold text-primary">Our Locations</h3>
                
                <div className="grid gap-6">
                  {/* Madikeri Location */}
                  <Card className="bg-card border border-border">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <MapPin className="w-10 h-10 text-primary flex-shrink-0" />
                        <div className="flex-1">
                          <h4 className="font-display text-lg font-semibold text-foreground mb-2">
                            Madikeri Manufacturing Unit
                          </h4>
                          <p className="text-sm text-primary mb-2">Scotland of India / The Southern Kashmir</p>
                          <p className="text-sm text-muted-foreground mb-4">
                            Sharma Coffee Works
                            <br />
                            Opposite to KSRTC Bus Stand
                            <br />
                            Bus Stand Road, Madikeri, Coorg
                            <br />
                            Karnataka 571201
                          </p>
                          <div className="flex items-start gap-2 mt-4 pt-4 border-t border-border">
                            <Clock className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-muted-foreground">
                              <p className="font-medium text-foreground mb-1">Hours of Operation:</p>
                              <p>Monday to Saturday: 8:30 AM to 8:30 PM</p>
                              <p>Sunday: 9:00 AM to 1:00 PM</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Mysore Location */}
                  <Card className="bg-card border border-border">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <MapPin className="w-10 h-10 text-primary flex-shrink-0" />
                        <div className="flex-1">
                          <h4 className="font-display text-lg font-semibold text-foreground mb-2">
                            Mysore Manufacturing Unit
                          </h4>
                          <p className="text-sm text-primary mb-2">The Heritage City / The Cultural Capital of Karnataka</p>
                          <p className="text-sm text-muted-foreground mb-4">
                            Near Sangam Bhandar bus stop
                            <br />
                            Prashanthnagar, Bogadi 2nd stage
                            <br />
                            Mysore, Karnataka 570026
                          </p>
                          <div className="flex items-start gap-2 mt-4 pt-4 border-t border-border">
                            <Clock className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-muted-foreground">
                              <p className="font-medium text-foreground mb-1">Hours of Operation:</p>
                              <p>Monday to Saturday:</p>
                              <p className="ml-4">9:00 AM to 12:30 PM</p>
                              <p className="ml-4">4:30 PM to 8:30 PM</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Social Links */}
              <div>
                <h3 className="font-semibold mb-4">Follow Us</h3>
                <div className="flex gap-4">
                  <a
                    href="#"
                    className="p-3 bg-muted rounded-full hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    <Instagram className="w-5 h-5" />
                  </a>
                  <a
                    href="#"
                    className="p-3 bg-muted rounded-full hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    <Facebook className="w-5 h-5" />
                  </a>
                  <a
                    href="#"
                    className="p-3 bg-muted rounded-full hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    <Twitter className="w-5 h-5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 md:py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="max-w-2xl mx-auto">
            <Accordion type="single" collapsible className="space-y-2">
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="bg-background rounded-lg px-4"
                >
                  <AccordionTrigger className="text-left font-medium">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>
    </>
  );
}
