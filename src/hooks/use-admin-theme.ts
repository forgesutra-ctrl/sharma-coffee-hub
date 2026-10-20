import { useEffect } from 'react';

// Applies the dark admin theme to <html> while the calling component is
// mounted. It has to sit on <html> rather than a wrapper div: <body> resolves
// its colour from the theme tokens, and portalled dialogs, popovers and toasts
// render outside any wrapper.
export function useAdminTheme() {
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add('admin-theme');
    return () => html.classList.remove('admin-theme');
  }, []);
}
