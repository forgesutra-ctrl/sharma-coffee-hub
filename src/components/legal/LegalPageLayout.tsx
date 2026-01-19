import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface Section {
  heading: string;
  content: string;
  list?: string[];
  footer?: string;
}

interface LegalPageLayoutProps {
  title: string;
  lastUpdated: string;
  sections: Section[];
}

export default function LegalPageLayout({ title, lastUpdated, sections }: LegalPageLayoutProps) {
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
            <h1 className="font-serif text-3xl md:text-4xl font-semibold">{title}</h1>
            <p className="text-white/60 mt-2">Last updated: {lastUpdated}</p>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 py-12 md:py-16">
          <div className="prose prose-lg max-w-none">
            {sections.map((section, index) => (
              <div key={index} className="mb-10">
                <h2 className="font-serif text-xl md:text-2xl font-semibold text-foreground mb-4">
                  {section.heading}
                </h2>
                
                {section.content && (
                  <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                    {section.content}
                  </p>
                )}
                
                {section.list && (
                  <ul className="mt-4 space-y-2">
                    {section.list.map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-muted-foreground">
                        <span className="w-1.5 h-1.5 rounded-full bg-coffee-gold mt-2.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
                
                {section.footer && (
                  <p className="mt-4 text-muted-foreground italic">
                    {section.footer}
                  </p>
                )}
              </div>
            ))}
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
    </Layout>
  );
}
