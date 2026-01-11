import LegalPageLayout from '@/components/legal/LegalPageLayout';
import { shippingPolicyContent } from '@/data/legalContent';

export default function ShippingPolicy() {
  return (
    <LegalPageLayout
      title={shippingPolicyContent.title}
      lastUpdated={shippingPolicyContent.lastUpdated}
      sections={shippingPolicyContent.sections}
    />
  );
}
