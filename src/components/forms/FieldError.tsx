import { AlertCircle } from 'lucide-react';

/**
 * A field's error message, styled by .form-error (home-v2.css): an icon and words, so
 * the error never relies on colour alone. Point the field's aria-describedby at `id`.
 */
export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="form-error">
      <AlertCircle aria-hidden /> {message}
    </p>
  );
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Moves focus to the first field with an error, in DOM order. */
export function focusFirstError(form: HTMLFormElement | null) {
  form?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
}
