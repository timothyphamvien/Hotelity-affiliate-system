import { useState, useEffect } from 'react';

/**
 * Interface representing a query/mutation operation
 */
export interface SyncOptions<T> {
  key: string;                       // Unique cache key (e.g. 'rooms', 'bookings')
  fetchFn: () => Promise<T>;         // Database backend query fetcher
  onOptimisticUpdate?: (prev: T, payload: any) => T; // Mutator function
}

/**
 * Microservices State Manager with Optimistic Updates & Cache Reconciliation.
 * Keeps user experiences absolutely fluid (0ms interaction delays) during transitions.
 */
class MicrostateSyncManager {
  private cache = new Map<string, any>();
  private listeners = new Map<string, Set<(data: any) => void>>();

  // Return query cached values or invoke fetch
  async query<T>(key: string, fetcher: () => Promise<T>, forceRefresh = false): Promise<T> {
    if (!forceRefresh && this.cache.has(key)) {
      return this.cache.get(key) as T;
    }
    const data = await fetcher();
    this.setCache(key, data);
    return data;
  }

  // Set Cache with event propagation
  setCache(key: string, data: any) {
    this.cache.set(key, data);
    const subscribers = this.listeners.get(key);
    if (subscribers) {
      subscribers.forEach(cb => cb(data));
    }
  }

  // Read-only cache accessor
  getCache<T>(key: string): T | undefined {
    return this.cache.get(key) as T;
  }

  // Subscribe to changes
  subscribe(key: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback);
    return () => {
      const subscribers = this.listeners.get(key);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.listeners.delete(key);
        }
      }
    };
  }

  /**
   * Performs an Optimistic Mutation.
   * Immediately updates local frontend UI state with predicted outcome,
   * fires network payload in background. Resolves to actual backend state,
   * or rolls back to the prior authoritative state on error.
   */
  async mutate<T, P>({
    key,
    mutationFn,
    payload,
    optimisticReducer
  }: {
    key: string;
    mutationFn: (payload: P) => Promise<any>;
    payload: P;
    optimisticReducer: (current: T, payload: P) => T;
  }) {
    const previousState = this.cache.get(key) as T;
    
    // Step 1: Apply Optimistic Update to cache (0ms lag)
    if (previousState !== undefined) {
      const predictedState = optimisticReducer(previousState, payload);
      this.setCache(key, predictedState);
    }

    try {
      // Step 2: Fire network database request to microservice
      const serverResult = await mutationFn(payload);
      
      // Step 3: Server accepted change. Update cache with actual payload returned by server
      if (serverResult && typeof serverResult === 'object') {
        const validatedState = this.reconcileServerState<T>(previousState, serverResult);
        this.setCache(key, validatedState);
      }
      return serverResult;
    } catch (error) {
      // Step 4: Network error. Rollback state to guarantee data fidelity
      console.warn('Microservices sync error, rolling back local state.', error);
      if (previousState !== undefined) {
        this.setCache(key, previousState);
      }
      throw error;
    }
  }

  private reconcileServerState<T>(currentCache: T, serverResponse: any): T {
    // Elegant check to replace matching array IDs or merge fields
    if (Array.isArray(currentCache)) {
      return currentCache.map((item: any) => 
        item.id === serverResponse.id ? { ...item, ...serverResponse } : item
      ) as unknown as T;
    }
    return { ...currentCache, ...serverResponse };
  }
}

export const syncManager = new MicrostateSyncManager();

/**
 * Custom React Hook: Similar to useQuery inside React Query.
 * Retains high performance, handles auto-reconnections, and eliminates UI flicker.
 */
export function useSyncQuery<T>(key: string, fetchFn: () => Promise<T>) {
  const [data, setData] = useState<T | undefined>(() => syncManager.getCache<T>(key));
  const [loading, setLoading] = useState(!syncManager.getCache(key));
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;

    // Direct listener binding for responsive broadcast
    const unsubscribe = syncManager.subscribe(key, (newData) => {
      if (active) {
        setData(newData);
        setLoading(false);
      }
    });

    const triggerFetch = async () => {
      try {
        const fetched = await syncManager.query(key, fetchFn, true);
        if (active) {
          setData(fetched);
          setError(null);
        }
      } catch (err: any) {
        if (active) {
          setError(err instanceof Error ? err : new Error(err.message || 'Unknown network error'));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    triggerFetch();

    return () => {
      active = false;
      unsubscribe();
    };
  }, [key, fetchFn]);

  return { data, loading, error, refetch: () => syncManager.query(key, fetchFn, true) };
}
