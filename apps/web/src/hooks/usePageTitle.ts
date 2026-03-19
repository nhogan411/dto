import { useEffect, useRef } from 'react';

export function usePageTitle(title: string): void {
  const initialTitleRef = useRef<string | null>(null);

  useEffect(() => {
    if (initialTitleRef.current === null) {
      initialTitleRef.current = document.title;
    }

    document.title = `${title} - DTO`;

    return () => {
      if (initialTitleRef.current !== null) {
        document.title = initialTitleRef.current;
      }
    };
  }, [title]);
}
