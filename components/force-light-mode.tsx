'use client';

import { useEffect } from 'react';

export default function ForceLightMode() {
  useEffect(() => {
    // Force light mode for Toolpad
    document.documentElement.setAttribute('data-toolpad-color-scheme', 'light');
    
    // Also set any other potential dark mode attributes to light
    document.documentElement.setAttribute('data-color-scheme', 'light');
    
    // Override any CSS variables that might be set to dark values
    const root = document.documentElement;
    root.style.setProperty('--mui-palette-common-background', '#FAFBFD', 'important');
    root.style.setProperty('--mui-palette-background-default', '#FAFBFD', 'important');
    root.style.setProperty('--mui-palette-background-paper', '#FFFFFF', 'important');
    root.style.setProperty('--mui-palette-text-primary', '#1A1A1A', 'important');
    root.style.setProperty('--mui-palette-text-secondary', '#5A6C7D', 'important');
    
    // Force body background
    document.body.style.backgroundColor = '#FAFBFD';
    
    // Listen for any changes and force back to light
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-toolpad-color-scheme') {
          const element = mutation.target as HTMLElement;
          if (element.getAttribute('data-toolpad-color-scheme') !== 'light') {
            element.setAttribute('data-toolpad-color-scheme', 'light');
          }
        }
      });
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-toolpad-color-scheme']
    });
    
    return () => {
      observer.disconnect();
    };
  }, []);

  return null; // This component doesn't render anything
} 