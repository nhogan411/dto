import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  isActive: boolean,
  onClose: () => void
): void {
  const previousActiveElementRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!isActive || !ref.current) {
      return;
    }

    const focusableElements = ref.current.querySelectorAll(
      'a[href], button:not([disabled]), textarea, input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const focusableArray = Array.from(focusableElements);

    previousActiveElementRef.current = document.activeElement;

    const firstElement = focusableArray.length > 0 ? focusableArray[0] : ref.current;
    (firstElement as HTMLElement).focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key !== 'Tab') {
        return;
      }

      if (focusableArray.length === 0) {
        e.preventDefault();
        return;
      }

      const currentIndex = focusableArray.indexOf(document.activeElement as Element);

      if (e.shiftKey) {
        if (currentIndex <= 0) {
          e.preventDefault();
          (focusableArray[focusableArray.length - 1] as HTMLElement).focus();
        }
      } else {
        if (currentIndex >= focusableArray.length - 1) {
          e.preventDefault();
          (focusableArray[0] as HTMLElement).focus();
        }
      }
    };

    ref.current.addEventListener('keydown', handleKeyDown);

    const currentRef = ref.current;
    return () => {
      currentRef?.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive, ref, onClose]);

  useEffect(() => {
    return () => {
      if (previousActiveElementRef.current && previousActiveElementRef.current instanceof HTMLElement) {
        previousActiveElementRef.current.focus();
      }
    };
  }, []);
}
