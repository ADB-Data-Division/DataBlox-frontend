'use client';

import { useEffect, RefObject } from 'react';
import { trackUserInteraction } from '../../../src/utils/analytics';

interface UseKeyboardShortcutsProps {
  inputRef: RefObject<HTMLInputElement>;
  onShowShortcutsModal: () => void;
}

export function useKeyboardShortcuts({ 
  inputRef, 
  onShowShortcutsModal 
}: UseKeyboardShortcutsProps) {
  useEffect(() => {
    const handleGlobalKeyDown = (event: globalThis.KeyboardEvent) => {
      const cmdOrCtrl = event.metaKey || event.ctrlKey;

      // CMD/CTRL + K: Focus search
      if (cmdOrCtrl && event.key === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        return;
      }

      // CMD/CTRL + /: Show shortcuts modal
      if (cmdOrCtrl && event.key === '/') {
        event.preventDefault();
        onShowShortcutsModal();
        trackUserInteraction('keyboard_shortcut', 'show_help_modal');
        return;
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [inputRef, onShowShortcutsModal]);
}