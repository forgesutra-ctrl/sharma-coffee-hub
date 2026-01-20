import { ManageSubscription } from "@/components/subscription/ManageSubscription";
import { ManageDeliveries } from "@/components/subscription/ManageDeliveries";

export default function AccountSubscriptions() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">My Subscriptions</h2>
        <p className="text-muted-foreground">
          Manage your coffee subscriptions, delivery schedule, and preferences.
        </p>
      </div>

      {/* Existing subscription management (status, address, etc.) */}
      <ManageSubscription />

      {/* Delivery schedule management (decoupled from billing) */}
      <ManageDeliveries />
    </div>
  );
}

