import LegalPageLayout from '@/components/legal/LegalPageLayout';
import { refundPolicyContent } from '@/data/legalContent';

export default function RefundPolicy() {
  return (
    <LegalPageLayout
      title={refundPolicyContent.title}
      lastUpdated={refundPolicyContent.lastUpdated}
      sections={refundPolicyContent.sections}
    />
  );
}
