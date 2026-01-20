import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Calendar, Package, Clock, SkipForward } from "lucide-react";

interface Delivery {
  id: string;
  subscription_id: string;
  cycle_number: number;
  delivery_date: string;
  status: "scheduled" | "delivered" | "skipped";
  created_at: string;
  product_name: string | null;
  quantity: number | null;
  weight: number | null;
}

export function ManageDeliveries() {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchDeliveries();
    }
  }, [user]);

  const fetchDeliveries = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-deliveries", {
        body: { action: "list" },
      });

      if (error) throw error;
      setDeliveries((data?.deliveries || []) as Delivery[]);
    } catch (err) {
      console.error("Failed to load deliveries:", err);
      toast.error("Failed to load upcoming deliveries");
    } finally {
      setLoading(false);
    }
  };

  const handleChangeDate = async (delivery: Delivery) => {
    const current = new Date(delivery.delivery_date);
    const suggestion = new Date(current);
    suggestion.setDate(suggestion.getDate() + 7);
    const suggestedStr = suggestion.toISOString().slice(0, 10);

    const newDate = window.prompt(
      `Enter new delivery date (YYYY-MM-DD).\n\nBilling is automatic; you can only change delivery dates more than 3 days in advance.\n\nSuggested date: ${suggestedStr}`,
      suggestedStr,
    );

    if (!newDate) return;

    setUpdatingId(delivery.id);
    try {
      const { data, error } = await supabase.functions.invoke("manage-deliveries", {
        body: {
          action: "update_date",
          deliveryId: delivery.id,
          newDate,
        },
      });

      if (error || data?.error) {
        throw new Error(error?.message || data?.error || "Failed to update delivery date");
      }

      toast.success("Delivery date updated");
      fetchDeliveries();
    } catch (err) {
      console.error("Failed to update delivery date:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to update delivery date. Please check the cutoff rules.",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSkip = async (delivery: Delivery) => {
    if (!window.confirm("Are you sure you want to skip this delivery? Billing for this cycle has already occurred.")) {
      return;
    }

    setUpdatingId(delivery.id);
    try {
      const { data, error } = await supabase.functions.invoke("manage-deliveries", {
        body: {
          action: "skip",
          deliveryId: delivery.id,
        },
      });

      if (error || data?.error) {
        throw new Error(error?.message || data?.error || "Failed to skip delivery");
      }

      toast.success("Delivery skipped");
      fetchDeliveries();
    } catch (err) {
      console.error("Failed to skip delivery:", err);
      toast.error(err instanceof Error ? err.message : "Failed to skip delivery");
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status: Delivery["status"]) => {
    switch (status) {
      case "scheduled":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Scheduled</Badge>;
      case "delivered":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Delivered</Badge>;
      case "skipped":
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Skipped</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Delivery Schedule
        </CardTitle>
        <CardDescription>
          Billing is automatic via Razorpay. Delivery dates can be adjusted before the 3-day cutoff window for each
          cycle (starting from cycle 2).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-center text-muted-foreground py-4">Loading upcoming deliveries…</p>
        ) : deliveries.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">No upcoming deliveries found.</p>
        ) : (
          <div className="space-y-3">
            {deliveries.map((delivery) => {
              const isFirstCycle = delivery.cycle_number === 1;
              const deliveryDate = new Date(delivery.delivery_date);
              const dateLabel = format(deliveryDate, "MMM dd, yyyy");

              return (
                <div
                  key={delivery.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border rounded-lg p-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {delivery.product_name || "Subscription"} · Cycle {delivery.cycle_number}
                      </span>
                      {getStatusBadge(delivery.status)}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span>
                        Qty: {delivery.quantity ?? "—"}
                        {delivery.weight ? ` · ${delivery.weight}g` : ""}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {dateLabel}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Created {format(new Date(delivery.created_at), "MMM dd, yyyy")}
                      </span>
                      {isFirstCycle && (
                        <span className="text-xs text-muted-foreground">
                          First delivery (created automatically with initial payment)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {!isFirstCycle && delivery.status === "scheduled" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleChangeDate(delivery)}
                          disabled={updatingId === delivery.id}
                        >
                          <Calendar className="h-4 w-4 mr-1" />
                          Change Date
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSkip(delivery)}
                          disabled={updatingId === delivery.id}
                        >
                          <SkipForward className="h-4 w-4 mr-1" />
                          Skip
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

