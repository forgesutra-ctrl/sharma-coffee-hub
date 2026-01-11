import LegalPageLayout from '@/components/legal/LegalPageLayout';
import { termsOfServiceContent } from '@/data/legalContent';

export default function TermsOfService() {
  return (
    <LegalPageLayout
      title={termsOfServiceContent.title}
      lastUpdated={termsOfServiceContent.lastUpdated}
      sections={termsOfServiceContent.sections}
    />
  );
}
