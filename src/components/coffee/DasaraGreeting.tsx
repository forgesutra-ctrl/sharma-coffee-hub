import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Truck } from 'lucide-react';

/**
 * Dasara festival greeting popup.
 *
 * Shows once per browsing session on public pages, and stops appearing
 * automatically after the cut-off below — no code change or redeploy needed
 * to take it down.
 *
 * To remove it early, change DASARA_END to a past date (or delete the
 * <DasaraGreeting /> line from Layout.tsx).
 * To reuse it next year, update DASARA_END and bump SESSION_KEY.
 */
const DASARA_END = new Date('2026-10-25T23:59:59+05:30');
const SESSION_KEY = 'dasara-2026-greeting-seen';

export default function DasaraGreeting() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Past the festival window — never show again.
    if (new Date() > DASARA_END) return;

    // Already shown in this visit.
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
    } catch {
      // sessionStorage can throw in private mode; fall through and show once.
    }

    // Let the page paint before interrupting.
    const timer = setTimeout(() => setIsOpen(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      try {
        sessionStorage.setItem(SESSION_KEY, '1');
      } catch {
        // Ignore — worst case it shows again on the next page view.
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md border-primary/30 bg-card overflow-hidden">
        {/* Warm glow behind the greeting */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-24 h-48 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.22),transparent_70%)]"
        />

        <div className="relative text-center pt-2 pb-1">
          {/* Lamp */}
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/30">
            <svg
              viewBox="0 0 24 24"
              className="h-7 w-7 text-primary"
              fill="currentColor"
              aria-hidden="true"
            >
              {/* flame */}
              <path d="M12 2.5c.9 2.2.3 3.5-.6 4.6-.9 1.1-1.6 2-1.6 3.3a2.2 2.2 0 0 0 4.4 0c0-.8-.3-1.4-.6-2 1.4.9 2.3 2.3 2.3 4a3.9 3.9 0 0 1-7.8 0c0-3.2 3.1-4.4 3.9-9.9Z" />
              {/* diya bowl */}
              <path d="M3.8 16.4h16.4c.5 0 .8.5.6.9-1 2.1-3.9 3.6-8.8 3.6s-7.8-1.5-8.8-3.6c-.2-.4.1-.9.6-.9Z" />
            </svg>
          </div>

          <DialogTitle className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Happy Dasara
          </DialogTitle>

          <p
            lang="kn"
            className="mt-2 font-kannada text-xl text-primary"
          >
            ದಸರಾ ಹಬ್ಬದ ಶುಭಾಶಯಗಳು
          </p>

          <div className="mx-auto my-5 h-px w-20 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

          <DialogDescription asChild>
            <div className="flex items-start gap-3 rounded-lg border border-border bg-secondary/50 px-4 py-3 text-left">
              <Truck className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
              <p className="text-sm text-muted-foreground">
                Due to the Dasara festivities, deliveries may be slightly
                delayed. Thank you for your patience.
              </p>
            </div>
          </DialogDescription>

          <Button
            className="mt-5 w-full"
            onClick={() => handleOpenChange(false)}
          >
            Continue Shopping
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
