import { useCallback, useEffect, useState } from "react";
import { getStorage, setStorage } from "@/lib/storage";

export function useCollection<T extends { id: string }>(key: string) {
  const [items, setItems] = useState<T[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItems(getStorage<T[]>(key, []));
    setReady(true);
  }, [key]);

  const persist = useCallback(
    (next: T[]) => {
      setItems(next);
      setStorage(key, next);
    },
    [key],
  );

  const add = useCallback(
    (item: T) => {
      persist([item, ...items]);
    },
    [items, persist],
  );

  const update = useCallback(
    (id: string, patch: Partial<T>) => {
      persist(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    },
    [items, persist],
  );

  const remove = useCallback(
    (id: string) => {
      persist(items.filter((i) => i.id !== id));
    },
    [items, persist],
  );

  return { items, ready, add, update, remove, setAll: persist };
}
