import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import '@/components/home-v2/home-v2.css';

// The four policy pages, built from the shared inner-page vocabulary in home-v2.css:
// a page intro, then each section as a ruled item set in long-form prose (16px).

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
    <div className="home-v2 page">
        {/* Header */}
        <div className="page-intro section-inner">
          <Link to="/" className="page-back">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <h1>{title}</h1>
          <p className="section-note">Last updated: {lastUpdated}</p>
        </div>

        {/* Content */}
        <div className="page-section section-inner">
          <div className="page-prose"><div className="page-stack">
            {sections.map((section, index) => (
              <div key={index} className="page-item">
                <h2>{section.heading}</h2>

                {section.content && (
                  <p className="text-muted-foreground whitespace-pre-line">
                    {section.content}
                  </p>
                )}

                {/* Kept from the previous design: no equivalent in the vocabulary. */}
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
          </div></div>

          {/* Back Link */}
          <div className="mt-12 pt-8 border-t border-border">
            <Link to="/" className="page-back">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
  );
}
