import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { MediaAsset } from '@/lib/site-media';

export type Film = { title: string; subtitle: string; media: MediaAsset; poster: string; duration: string };

// Ported from the reference redesign. `container` lets the page portal the dialog
// inside its `.home-v2` wrapper, so the scoped styles apply to it.
export function FilmDialog({
  film,
  onClose,
  container,
}: {
  film: Film | null;
  onClose: () => void;
  container?: HTMLElement | null;
}) {
  return (
    <Dialog.Root open={Boolean(film)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal container={container ?? undefined}>
        <Dialog.Overlay className="film-overlay" />
        <Dialog.Content className="film-dialog">
          <div className="film-dialog-heading">
            <div>
              <Dialog.Title>{film?.title}</Dialog.Title>
              <Dialog.Description>{film?.subtitle}</Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button variant="film" size="icon" aria-label="Close film"><X /></Button>
            </Dialog.Close>
          </div>
          {film && (
            <video key={film.media.url} poster={film.poster} controls autoPlay playsInline className="film-dialog-video">
              <source src={film.media.url} type="video/webm" />
              {film.media.fallback && <source src={film.media.fallback} type="video/mp4" />}
            </video>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
