import { useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Instagram,
  Facebook,
  Twitter,
  MessageCircle,
  ArrowUpRight,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PHONE_TEL, WHATSAPP_URL } from '@/components/nav/commerce';
import { FieldError, EMAIL_PATTERN, focusFirstError } from '@/components/forms/FieldError';
import '@/components/home-v2/home-v2.css';

// Contact, built from the shared inner-page vocabulary in home-v2.css, including its
// form fields and accordion.

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

type ContactField = 'name' | 'email' | 'phone' | 'subject' | 'message';

// Optional; matches the contact_messages.phone CHECK: digits with an optional leading +,
// spaces, dashes or brackets, 7 to 20 characters.
const PHONE_PATTERN = /^\+?[0-9][0-9 ()-]*[0-9]$/;

function validateContact(data: Record<ContactField, string>) {
  const errors: Partial<Record<ContactField, string>> = {};
  if (!data.name.trim()) errors.name = 'Please enter your name.';
  if (!data.email.trim()) errors.email = 'Please enter your email address.';
  else if (!EMAIL_PATTERN.test(data.email.trim())) errors.email = 'That email address looks incomplete. Check it has an @ and a domain, like name@example.com.';
  const phone = data.phone.trim();
  if (phone && (phone.length < 7 || phone.length > 20 || !PHONE_PATTERN.test(phone))) {
    errors.phone = 'That number does not look right. Use digits, with +91 if you like, or leave it blank.';
  }
  if (!data.subject.trim()) errors.subject = 'Please add a subject.';
  if (!data.message.trim()) errors.message = 'Please write a message.';
  return errors;
}

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  // Honeypot: a field people never see. Bots that fill every input fill this one too.
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState<Partial<Record<ContactField, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  // 'sent' only after the row is stored; 'failed' keeps everything the visitor typed.
  const [sendState, setSendState] = useState<'idle' | 'sent' | 'failed'>('idle');
  const [sentTo, setSentTo] = useState('');
  const inFlight = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const update = (field: ContactField, value: string) => {
    setFormData({ ...formData, [field]: value });
    // A field's error clears as soon as it is edited.
    if (errors[field]) setErrors({ ...errors, [field]: undefined });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = validateContact(formData);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      // After aria-invalid renders, take the user to the first problem.
      requestAnimationFrame(() => focusFirstError(formRef.current));
      return;
    }
    if (inFlight.current) return; // no double-sends

    if (website.trim()) {
      // A bot: answer exactly as for a real message, and store nothing.
      setSentTo(formData.email.trim());
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
      setWebsite('');
      setSendState('sent');
      requestAnimationFrame(() => resultRef.current?.focus());
      return;
    }

    inFlight.current = true;
    setIsSubmitting(true);
    setSendState('idle');

    // No .select() after the insert: visitors may write a message but never read one back.
    const { error } = await supabase.from('contact_messages').insert({
      name: formData.name.trim(),
      email: formData.email.trim(),
      // Sent only when given, so the form keeps working if this ships before the phone column.
      ...(formData.phone.trim() ? { phone: formData.phone.trim() } : {}),
      subject: formData.subject.trim(),
      message: formData.message.trim(),
    });

    inFlight.current = false;
    setIsSubmitting(false);
    if (error) {
      console.error('Contact message was not stored:', error);
      setSendState('failed');
    } else {
      setSentTo(formData.email.trim());
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
      setSendState('sent');
    }
    requestAnimationFrame(() => resultRef.current?.focus());
  };

  const fieldProps = (field: ContactField) => ({
    id: field,
    value: formData[field],
    'aria-invalid': errors[field] ? true : undefined,
    'aria-describedby': errors[field] ? `${field}-error` : undefined,
    className: 'form-input',
  });

  return (
    <div className="home-v2 page">
      {/* Hero Section */}
      <section>
        <div className="page-intro section-inner">
          <h1>Get in Touch</h1>
          <p className="page-lede">
            Have questions? We'd love to hear from you. Send us a message and
            we'll respond as soon as possible.
          </p>
        </div>
      </section>

      {/* Contact Section */}
      <section className="page-section">
        <div className="page-split page-split--top section-inner">
          {/* Contact Form */}
          <div>
            <h2 className="page-heading">Send us a Message</h2>
            {sendState === 'sent' ? (
              <div ref={resultRef} tabIndex={-1} role="status" className="form-result form-result--success">
                <CheckCircle2 aria-hidden />
                <div>
                  <p className="form-result-title">Thank you. Your message has reached us.</p>
                  <p>We'll reply to {sentTo} as soon as we can, usually within a working day.</p>
                  <button type="button" className="shop-empty-secondary mt-4" onClick={() => setSendState('idle')}>
                    Send another message
                  </button>
                </div>
              </div>
            ) : (
            <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="form-field">
                  <Label htmlFor="name" className="form-label">Name</Label>
                  <Input
                    {...fieldProps('name')}
                    onChange={(e) => update('name', e.target.value)}
                    placeholder="Your name"
                    autoComplete="name"
                    required
                  />
                  <FieldError id="name-error" message={errors.name} />
                </div>
                <div className="form-field">
                  <Label htmlFor="email" className="form-label">Email</Label>
                  <Input
                    {...fieldProps('email')}
                    type="email"
                    onChange={(e) => update('email', e.target.value)}
                    placeholder="your@email.com"
                    autoComplete="email"
                    required
                  />
                  <FieldError id="email-error" message={errors.email} />
                </div>
              </div>

              <div className="form-field">
                <Label htmlFor="phone" className="form-label">Phone / WhatsApp (optional)</Label>
                <Input
                  {...fieldProps('phone')}
                  type="tel"
                  inputMode="tel"
                  onChange={(e) => update('phone', e.target.value)}
                  placeholder="+91 98765 43210"
                  autoComplete="tel"
                />
                <FieldError id="phone-error" message={errors.phone} />
              </div>

              {/* Honeypot: off-screen, out of the tab order and hidden from assistive tech. */}
              <div className="form-honeypot" aria-hidden="true">
                <label htmlFor="website">Website</label>
                <input
                  id="website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>

              <div className="form-field">
                <Label htmlFor="subject" className="form-label">Subject</Label>
                <Input
                  {...fieldProps('subject')}
                  onChange={(e) => update('subject', e.target.value)}
                  placeholder="How can we help?"
                  required
                />
                <FieldError id="subject-error" message={errors.subject} />
              </div>

              <div className="form-field">
                <Label htmlFor="message" className="form-label">Message</Label>
                <Textarea
                  {...fieldProps('message')}
                  onChange={(e) => update('message', e.target.value)}
                  placeholder="Your message..."
                  rows={5}
                  required
                />
                <FieldError id="message-error" message={errors.message} />
              </div>

              {sendState === 'failed' && (
                <div ref={resultRef} tabIndex={-1} role="alert" className="form-result form-result--error">
                  <AlertCircle aria-hidden />
                  <div>
                    <p className="form-result-title">Your message could not be sent.</p>
                    <p>
                      Nothing was lost: what you wrote is still here. Please try again, or reach us
                      directly on <a href={PHONE_TEL}>+91 8762 988 145</a> or{' '}
                      <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">WhatsApp</a>.
                    </p>
                  </div>
                </div>
              )}

              <button type="submit" className="form-submit" disabled={isSubmitting} aria-disabled={isSubmitting}>
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>
            )}
          </div>

          {/* Contact Info */}
          <div className="space-y-10">
            <h2 className="page-heading">Contact Information</h2>

            {/* Contact Methods */}
            <div className="page-item">
              <Phone />
              <h3>Phone</h3>
              <p>
                <a href="tel:+918762988145" className="text-primary hover:text-primary/80 font-semibold">
                  +91 8762 988 145
                </a>
                <span className="ml-2">(Primary)</span>
              </p>
              <p>
                <a href="tel:+916363235357" className="text-foreground hover:text-primary">
                  +91 6363 235 357
                </a>
                <span className="ml-2">(Secondary)</span>
              </p>
              <a
                href="https://wa.me/918762988145"
                target="_blank"
                rel="noopener noreferrer"
                className="arrow-link"
              >
                <span className="inline-flex items-center gap-2"><MessageCircle className="w-4 h-4" /> Chat on WhatsApp</span>
                <ArrowUpRight />
              </a>
            </div>

            <div className="page-item">
              <Mail />
              <h3>Email</h3>
              <p>
                <a href="mailto:ask@sharmacoffeeworks.com" className="text-primary hover:text-primary/80">
                  ask@sharmacoffeeworks.com
                </a>
              </p>
            </div>

            {/* Locations */}
            <div className="space-y-6">
              <h3 className="eyebrow">Our Locations</h3>

              {/* Madikeri Location */}
              <div className="page-item">
                <MapPin />
                <h4>Madikeri Manufacturing Unit</h4>
                <p className="eyebrow">Scotland of India / The Southern Kashmir</p>
                <p>
                  Sharma Coffee Works
                  <br />
                  Opposite to KSRTC Bus Stand
                  <br />
                  Bus Stand Road, Madikeri, Coorg
                  <br />
                  Karnataka 571201
                </p>
                <div className="flex items-start gap-2 mt-4">
                  <Clock className="w-4 h-4 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-foreground">Hours of Operation:</p>
                    <p>Monday to Saturday: 8:30 AM to 8:30 PM</p>
                    <p>Sunday: 9:00 AM to 1:00 PM</p>
                  </div>
                </div>
              </div>

              {/* Mysore Location */}
              <div className="page-item">
                <MapPin />
                <h4>Mysore Manufacturing Unit</h4>
                <p className="eyebrow">The Heritage City / The Cultural Capital of Karnataka</p>
                <p>
                  Near Sangam Bhandar bus stop
                  <br />
                  Prashanthnagar, Bogadi 2nd stage
                  <br />
                  Mysore, Karnataka 570026
                </p>
                <div className="flex items-start gap-2 mt-4">
                  <Clock className="w-4 h-4 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-foreground">Hours of Operation:</p>
                    <p>Monday to Saturday:</p>
                    <p className="ml-4">9:00 AM to 12:30 PM</p>
                    <p className="ml-4">4:30 PM to 8:30 PM</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Social Links */}
            {/* Kept from the previous design: no equivalent in the vocabulary. */}
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
      </section>

      {/* FAQ Section */}
      <section className="page-section page-section--tint">
        <div className="section-inner">
          <h2 className="page-heading">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="page-accordion">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="page-accordion-item">
                <AccordionTrigger className="page-accordion-trigger">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="page-accordion-panel">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </div>
  );
}
