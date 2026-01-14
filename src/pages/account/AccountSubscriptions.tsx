import { ManageSubscription } from '@/components/subscription/ManageSubscription';

export default function AccountSubscriptions() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">My Subscriptions</h2>
        <p className="text-muted-foreground">
          Manage your coffee subscriptions, delivery schedule, and preferences
        </p>
      </div>

      <ManageSubscription />
    </div>
  );
}
