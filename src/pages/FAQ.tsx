import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { faqContent } from '@/data/legalContent';
import '@/components/home-v2/home-v2.css';

// FAQ, built from the shared inner-page vocabulary in home-v2.css: the search field
// and the accordion are the same ones /contact uses.

export default function FAQ() {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter questions based on search
  const filteredCategories = faqContent.categories.map(category => ({
    ...category,
    questions: category.questions.filter(
      q =>
        q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.questions.length > 0);

  return (
      <div className="home-v2 page">
        {/* Header */}
        <div className="page-intro section-inner">
          <Link to="/" className="page-back">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <h1>{faqContent.title}</h1>
          <p className="page-lede">Find answers to common questions</p>
        </div>

        {/* Search */}
        <div className="section-inner">
          <div className="form-field max-w-[760px]">
            <Label htmlFor="faq-search" className="form-label">Search questions</Label>
            <div className="form-input-wrap">
              <Search aria-hidden />
              <Input
                id="faq-search"
                type="search"
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
              />
            </div>
          </div>
        </div>

        {/* FAQ Content */}
        <div className="page-section section-inner">
          {filteredCategories.length === 0 ? (
            <div className="shop-empty">
              <p>No questions found matching your search.</p>
              <div className="shop-empty-actions">
                <button onClick={() => setSearchQuery('')} className="shop-empty-secondary">
                  Clear search
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-14">
              {filteredCategories.map((category, catIndex) => (
                <div key={catIndex}>
                  <h2 className="page-heading">{category.name}</h2>

                  <Accordion type="multiple" className="page-accordion">
                    {category.questions.map((item, qIndex) => (
                      <AccordionItem key={qIndex} value={`${catIndex}-${qIndex}`} className="page-accordion-item">
                        <AccordionTrigger className="page-accordion-trigger">
                          {item.question}
                        </AccordionTrigger>
                        <AccordionContent className="page-accordion-panel">
                          {item.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contact Section */}
        <section className="page-band">
          <h2>Still have questions?</h2>
          <p>We're here to help. Reach out to our support team.</p>
          <div className="page-band-actions">
            <Button asChild variant="hero"><a href="mailto:ask@sharmacoffeeworks.com">Email Support</a></Button>
            <Button asChild variant="film">
              <a href="https://wa.me/918762988145" target="_blank" rel="noopener noreferrer">
                <MessageCircle className="text-green-400" /> WhatsApp Us
              </a>
            </Button>
          </div>
        </section>
      </div>
  );
}
