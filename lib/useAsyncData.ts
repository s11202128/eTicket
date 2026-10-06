"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type AsyncData<T> = {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  reload: () => Promise<void>;
};

// Loads data on mount and whenever `key` changes. Ignores responses from
// stale requests so fast filter changes can't show out-of-order results.
export function useAsyncData<T>(loader: () => Promise<T>, key: string): AsyncData<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const requestId = useRef(0);
  const loaderRef = useRef(loader);

  useEffect(() => {
    loaderRef.current = loader;
  });

  const run = useCallback(async () => {
    const id = ++requestId.current;
    setIsLoading(true);
    setError(null);
    try {
      const result = await loaderRef.current();
      if (id === requestId.current) setData(result);
    } catch (caught) {
      if (id === requestId.current) {
        setError(caught instanceof Error ? caught.message : "Something went wrong.");
      }
    } finally {
      if (id === requestId.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void run();
  }, [run, key]);

  return { data, error, isLoading, reload: run };
}
