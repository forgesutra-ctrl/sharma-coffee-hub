import LegalPageLayout from '@/components/legal/LegalPageLayout';
import { privacyPolicyContent } from '@/data/legalContent';

export default function PrivacyPolicy() {
  return (
    <LegalPageLayout
      title={privacyPolicyContent.title}
      lastUpdated={privacyPolicyContent.lastUpdated}
      sections={privacyPolicyContent.sections}
    />
  );
}
