"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api";

interface UseQueryResult<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
  refetch: () => Promise<void>;
  setData: (updater: T | ((prev: T | null) => T)) => void;
}

/** Minimal client-side data hook with loading/error/refetch. */
export function useQuery<T>(path: string | null): UseQueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const seq = useRef(0);

  const fetcher = useCallback(async () => {
    if (!path) return;
    const id = ++seq.current;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1${path}`, { credentials: "include" });
      const body = await res.json().catch(() => null);
      if (id !== seq.current) return;
      if (!res.ok) {
        const err = (body as { error?: { code?: string; message?: string; details?: unknown } })?.error;
        setError(
          new ApiError(
            res.status,
            err?.code ?? "INTERNAL_ERROR",
            err?.message ?? "Request failed",
            err?.details,
          ),
        );
        setData(null);
      } else {
        setError(null);
        setData((body as { data: T }).data);
      }
    } catch (e) {
      if (id !== seq.current) return;
      setError(
        e instanceof ApiError
          ? e
          : new ApiError(0, "NETWORK_ERROR", e instanceof Error ? e.message : "Network error"),
      );
      setData(null);
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    void fetcher();
  }, [fetcher]);

  const update = useCallback((updater: T | ((prev: T | null) => T)) => {
    setData((prev) =>
      typeof updater === "function" ? (updater as (p: T | null) => T)(prev) : updater,
    );
  }, []);

  return { data, error, loading, refetch: fetcher, setData: update };
}

/** Paginated list hook. */
export function useListQuery<T>(
  path: string | null,
): {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number } | null;
  error: ApiError | null;
  loading: boolean;
  refetch: () => Promise<void>;
} {
  const [items, setItems] = useState<T[]>([]);
  const [meta, setMeta] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const seq = useRef(0);

  const fetcher = useCallback(async () => {
    if (!path) return;
    const id = ++seq.current;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1${path}`, { credentials: "include" });
      const body = await res.json().catch(() => null);
      if (id !== seq.current) return;
      if (!res.ok) {
        const err = (body as { error?: { code?: string; message?: string } })?.error;
        setError(
          new ApiError(res.status, err?.code ?? "INTERNAL_ERROR", err?.message ?? "Request failed"),
        );
        setItems([]);
      } else {
        setError(null);
        const parsed = body as { data: T[]; meta: typeof meta };
        setItems(parsed.data ?? []);
        setMeta(parsed.meta ?? null);
      }
    } catch (e) {
      if (id !== seq.current) return;
      setError(
        new ApiError(0, "NETWORK_ERROR", e instanceof Error ? e.message : "Network error"),
      );
      setItems([]);
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    void fetcher();
  }, [fetcher]);

  return { items, meta, error, loading, refetch: fetcher };
}
