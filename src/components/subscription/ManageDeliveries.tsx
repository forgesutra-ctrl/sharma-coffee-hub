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
      // Check if user is authenticated
      if (!user) {
        console.warn("No user found, skipping delivery fetch");
        setDeliveries([]);
        return;
      }

      // Use direct fetch to avoid CORS issues
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error("Session error:", sessionError);
        toast.error("Session error. Please log out and log back in.");
        return;
      }
      
      if (!session?.access_token) {
        console.error("No valid session available");
        toast.error("Please log out and log back in to refresh your session.");
        return;
      }
      
      // Debug: Log token info (first 20 chars only for security)
      console.log("Token info:", {
        tokenPrefix: session.access_token.substring(0, 20) + "...",
        expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
        isExpired: session.expires_at ? session.expires_at * 1000 < Date.now() : false,
        userId: user?.id,
      });
      
      // Verify the token is not expired
      if (session.expires_at && session.expires_at * 1000 < Date.now() - 60000) { // 1 minute buffer
        console.warn("Session token expired, attempting refresh...");
        const refreshResult = await supabase.auth.refreshSession();
        if (refreshResult.error || !refreshResult.data.session?.access_token) {
          console.error("Failed to refresh expired session:", refreshResult.error);
          toast.error("Your session has expired. Please log out and log back in.");
          return;
        }
        session.access_token = refreshResult.data.session.access_token;
      }
      
      // Use anon key for gateway authentication (bypasses JWT validation at gateway level)
      // Then pass user_id in body for server-side validation
      // This is the same approach used in create-razorpay-subscription
      // SUPABASE_URL and SUPABASE_ANON_KEY are already declared above
      
      console.log("Calling manage-deliveries with anon key authentication...");
      console.log("Request body:", { action: "list", user_id: user.id });
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/manage-deliveries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`, // Use anon key to bypass gateway JWT validation
          "apikey": SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ action: "list", user_id: user.id }), // user_id will be validated in Edge Function
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        
        // If 401, the JWT is invalid - don't retry, just inform user
        if (response.status === 401) {
          console.error("Authentication failed - JWT invalid:", errorData);
          toast.error("Your session has expired. Please log out and log back in.");
          return;
        }
        
        throw new Error(errorData.message || errorData.error || "Failed to fetch deliveries");
      }

      const data = await response.json();
      setDeliveries((data?.deliveries || []) as Delivery[]);
    } catch (err) {
      console.error("Failed to load deliveries:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to load upcoming deliveries";
      toast.error(errorMessage);
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
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      // Ensure we have a valid session before calling the function
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        // Try to refresh the session
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshedSession) {
          throw new Error("Session expired. Please log in again.");
        }
      }
      
      const currentSession = session || (await supabase.auth.getSession()).data.session;
      
      if (!currentSession?.access_token) {
        throw new Error("No valid session token available. Please log in again.");
      }
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/manage-deliveries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`, // Use anon key to bypass gateway JWT validation
          "apikey": SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          action: "update_date",
          deliveryId: delivery.id,
          newDate,
          user_id: user?.id, // Include user_id for server-side validation
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to update delivery date" }));
        throw new Error(errorData?.error || "Failed to update delivery date");
      }

      const data = await response.json();
      if (data?.error) {
        throw new Error(data.error);
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
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      // Ensure we have a valid session before calling the function
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        // Try to refresh the session
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshedSession) {
          throw new Error("Session expired. Please log in again.");
        }
      }
      
      const currentSession = session || (await supabase.auth.getSession()).data.session;
      
      if (!currentSession?.access_token) {
        throw new Error("No valid session token available. Please log in again.");
      }
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/manage-deliveries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`, // Use anon key to bypass gateway JWT validation
          "apikey": SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          action: "skip",
          deliveryId: delivery.id,
          user_id: user?.id, // Include user_id for server-side validation
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to skip delivery" }));
        throw new Error(errorData?.error || "Failed to skip delivery");
      }

      const data = await response.json();
      if (data?.error) {
        throw new Error(data.error);
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

