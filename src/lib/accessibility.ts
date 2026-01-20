/**
 * Accessibility utilities for safe aria-hidden and inert management.
 * 
 * IMPORTANT: Razorpay DOM elements are explicitly excluded from all
 * accessibility logic to prevent interference with payment flows.
 */

const RAZORPAY_SELECTORS = [
  '.razorpay-container',
  '[class*="razorpay"]',
  'iframe[src*="razorpay"]',
  '[id*="razorpay"]',
];

/**
 * Check if an element or any of its ancestors is a Razorpay element.
 * Razorpay elements should NEVER be affected by accessibility helpers.
 */
function isRazorpayElement(element: Element | null): boolean {
  if (!element) return false;
  
  // Check the element itself
  for (const selector of RAZORPAY_SELECTORS) {
    if (element.matches?.(selector)) {
      return true;
    }
  }
  
  // Check ancestors
  let parent = element.parentElement;
  while (parent) {
    for (const selector of RAZORPAY_SELECTORS) {
      if (parent.matches?.(selector)) {
        return true;
      }
    }
    parent = parent.parentElement;
  }
  
  return false;
}

/**
 * Safely set inert on an element, excluding Razorpay elements.
 * Prefer inert over aria-hidden for disabling background interaction.
 */
export function setInertSafely(element: HTMLElement | null, inert: boolean): void {
  if (!element || isRazorpayElement(element)) {
    return;
  }
  
  if (inert) {
    element.setAttribute('inert', '');
  } else {
    element.removeAttribute('inert');
  }
}

/**
 * Safely set aria-hidden on an element, excluding Razorpay elements.
 * WARNING: Only use when inert is not available. Prefer conditional rendering
 * or hidden attribute when possible.
 */
export function setAriaHiddenSafely(element: HTMLElement | null, hidden: boolean): void {
  if (!element || isRazorpayElement(element)) {
    return;
  }
  
  if (hidden) {
    element.setAttribute('aria-hidden', 'true');
  } else {
    element.removeAttribute('aria-hidden');
  }
}

/**
 * DEV-ONLY: Runtime guard to detect focus inside aria-hidden ancestors.
 * Logs warnings but does not interfere with functionality.
 * 
 * This should only run in development builds.
 */
export function setupFocusGuard(): () => void {
  // Only run in development
  if (import.meta.env.PROD) {
    return () => {}; // No-op in production
  }
  
  let lastFocusedElement: Element | null = null;
  
  const checkFocus = () => {
    const activeElement = document.activeElement;
    
    // Skip if no focus or same element
    if (!activeElement || activeElement === lastFocusedElement) {
      return;
    }
    
    lastFocusedElement = activeElement;
    
    // Skip Razorpay elements
    if (isRazorpayElement(activeElement)) {
      return;
    }
    
    // Check if focused element has aria-hidden ancestor
    let ancestor = activeElement.parentElement;
    while (ancestor) {
      // Skip Razorpay ancestors
      if (isRazorpayElement(ancestor)) {
        break;
      }
      
      const ariaHidden = ancestor.getAttribute('aria-hidden');
      if (ariaHidden === 'true') {
        console.warn(
          '[Accessibility] Focus detected inside aria-hidden ancestor:',
          {
            focusedElement: activeElement,
            ancestor: ancestor,
            suggestion: 'Use inert attribute or conditional rendering instead of aria-hidden',
          }
        );
        break;
      }
      
      ancestor = ancestor.parentElement;
    }
  };
  
  // Listen for focus events
  document.addEventListener('focusin', checkFocus);
  
  // Also check on initial load
  setTimeout(checkFocus, 100);
  
  // Return cleanup
  return () => {
    document.removeEventListener('focusin', checkFocus);
  };
}
