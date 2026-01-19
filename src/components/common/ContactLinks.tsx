import React from 'react';
import { Phone, MessageCircle } from 'lucide-react';

interface ContactLinksProps {
  layout?: 'horizontal' | 'vertical';
  size?: 'small' | 'medium' | 'large';
  highlightPrimary?: boolean;
}

export const ContactLinks: React.FC<ContactLinksProps> = ({ 
  layout = 'vertical', 
  size = 'medium',
  highlightPrimary = true
}) => {
  const containerClass = layout === 'horizontal' ? 'flex gap-4' : 'space-y-2';
  const textSize = size === 'small' ? 'text-sm' : size === 'large' ? 'text-lg' : 'text-base';
  const primaryClass = highlightPrimary ? 'font-bold text-green-600' : '';

  return (
    <div className={containerClass}>
      <p className={primaryClass}>
        <a href="tel:+918762988145" className={`${textSize} hover:text-green-900 flex items-center gap-2 underline`}>
          <Phone className="w-5 h-5" />
          🔴 +91 8762 988 145
        </a>
      </p>
      <p>
        <a href="tel:+916363235357" className={`${textSize} hover:text-blue-600 flex items-center gap-2`}>
          <Phone className="w-5 h-5" />
          🟡 +91 6363 235 357
        </a>
      </p>
      <p>
        <a href="tel:+918431891360" className={`${textSize} hover:text-blue-600 flex items-center gap-2`}>
          <Phone className="w-5 h-5" />
          🟠 +91 84318 91360
        </a>
      </p>
      <p>
        <a href="https://wa.me/918762988145" target="_blank" rel="noopener noreferrer" className={`${textSize} hover:text-green-700 flex items-center gap-2 font-semibold text-green-600`}>
          <MessageCircle className="w-5 h-5" />
          💬 WhatsApp (Primary)
        </a>
      </p>
    </div>
  );
};

// Usage: <ContactLinks layout="vertical" size="medium" highlightPrimary={true} />
