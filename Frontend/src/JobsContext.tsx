import { createContext, useContext, useEffect, useMemo, useState, useCallback, ReactNode } from 'react';
import { Job } from './data/mockData';
import { fetchJobs } from './api/jobs';
import { useSession } from './SessionContext';

type JobsContextType = {
  jobs: Job[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  /**
   * Local-only optimistic update — does NOT call the backend. Kept for
   * backward compatibility (nothing currently calls this; staff/queue.tsx
   * still manages its own local approve/reject state). Real writes go
   * through approveJob/rejectJob in src/api/jobs.ts, then refetch().
   */
  updateJob: (id: string, changes: Partial<Job>) => void;
};

const JobsContext = createContext<JobsContextType>({
  jobs: [],
  loading: true,
  error: null,
  refetch: async () => {},
  updateJob: () => {},
});

export function JobsProvider({ children }: { children: ReactNode }) {
  const { token, authLoading } = useSession();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setJobs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJobs(token);
      setJobs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // Wait for SessionContext to finish restoring/validating a stored
    // token before deciding there's "no token" — otherwise this fires
    // once with token=null on every app start before the real token loads.
    if (authLoading) return;
    load();
  }, [authLoading, load]);

  const updateJob = (id: string, changes: Partial<Job>) => {
    setJobs(prev => prev.map(job => (job.id === id ? { ...job, ...changes } : job)));
  };

  const value = useMemo(
    () => ({ jobs, loading, error, refetch: load, updateJob }),
    [jobs, loading, error, load]
  );

  return <JobsContext.Provider value={value}>{children}</JobsContext.Provider>;
}

export function useJobs() {
  return useContext(JobsContext);
}
