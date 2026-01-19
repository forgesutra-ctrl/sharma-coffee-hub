import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { faqContent } from '@/data/legalContent';
import { cn } from '@/lib/utils';

export default function FAQ() {
  const [searchQuery, setSearchQuery] = useState('');
  const [openItems, setOpenItems] = useState<string[]>([]);

  const toggleItem = (id: string) => {
    setOpenItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

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
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-coffee-dark text-white py-12 md:py-16">
          <div className="max-w-4xl mx-auto px-4">
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
            <h1 className="font-serif text-3xl md:text-4xl font-semibold">{faqContent.title}</h1>
            <p className="text-white/60 mt-2">Find answers to common questions</p>
          </div>
        </div>

        {/* Search */}
        <div className="max-w-4xl mx-auto px-4 -mt-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 text-lg bg-card border-border shadow-lg"
            />
          </div>
        </div>

        {/* FAQ Content */}
        <div className="max-w-4xl mx-auto px-4 py-12 md:py-16">
          {filteredCategories.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">No questions found matching your search.</p>
              <button 
                onClick={() => setSearchQuery('')}
                className="mt-4 text-coffee-gold hover:underline"
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className="space-y-10">
              {filteredCategories.map((category, catIndex) => (
                <div key={catIndex}>
                  <h2 className="font-serif text-xl md:text-2xl font-semibold text-foreground mb-6 pb-3 border-b border-border">
                    {category.name}
                  </h2>
                  
                  <div className="space-y-3">
                    {category.questions.map((item, qIndex) => {
                      const itemId = `${catIndex}-${qIndex}`;
                      const isOpen = openItems.includes(itemId);
                      
                      return (
                        <div 
                          key={qIndex}
                          className="border border-border rounded-lg overflow-hidden bg-card"
                        >
                          <button
                            onClick={() => toggleItem(itemId)}
                            className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/50 transition-colors"
                          >
                            <span className="font-medium text-foreground pr-4">
                              {item.question}
                            </span>
                            <ChevronDown 
                              className={cn(
                                "w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform duration-200",
                                isOpen && "rotate-180"
                              )}
                            />
                          </button>
                          
                          <div 
                            className={cn(
                              "overflow-hidden transition-all duration-200",
                              isOpen ? "max-h-96" : "max-h-0"
                            )}
                          >
                            <div className="px-5 pb-5 text-muted-foreground leading-relaxed border-t border-border pt-4">
                              {item.answer}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Contact Section */}
          <div className="mt-16 p-8 bg-coffee-dark/5 rounded-2xl text-center">
            <h3 className="font-serif text-xl font-semibold text-foreground mb-2">
              Still have questions?
            </h3>
            <p className="text-muted-foreground mb-6">
              We're here to help. Reach out to our support team.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="mailto:support@sharmacoffeeworks.com"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-coffee-gold text-coffee-dark font-semibold rounded-lg hover:bg-coffee-gold/90 transition-colors"
              >
                Email Support
              </a>
              <a 
                href="https://wa.me/919876543210"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
              >
                WhatsApp Us
              </a>
            </div>
          </div>

          {/* Back Link */}
          <div className="mt-12 pt-8 border-t border-border">
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 text-coffee-gold hover:text-coffee-gold/80 transition-colors font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
  );
}
