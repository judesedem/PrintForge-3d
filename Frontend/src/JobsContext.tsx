import { createContext, useContext, useEffect, useMemo, useState, useCallback, ReactNode } from 'react';
import { Job } from './data/mockData';
import { fetchJobs } from './api/jobs';
import { useSession } from './SessionContext';
import { useToast } from './ToastContext';

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
  const { showToast } = useToast();
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
      const message = err instanceof Error ? err.message : 'Failed to load jobs';
      setError(message);
      // `error` above has no consumer — none of the 5 screens reading
      // useJobs() (jobs/index.tsx, jobs/[id].tsx, staff/queue.tsx,
      // profile.tsx, dashboard/student.tsx) destructure it, so a failed
      // background fetch would otherwise show an empty list with zero
      // explanation. This is exactly the "no better UI home" case the
      // toast is for.
      showToast(message);
    } finally {
      setLoading(false);
    }
  }, [token, showToast]);

  useEffect(() => {
    // Wait for SessionContext to finish restoring/validating a stored
    // token before deciding there's "no token" — otherwise this fires
    // once with token=null on every app start before the real token loads.
    if (authLoading) return;
    // Explicit guard (load() already checks this internally) so it's
    // impossible for fetchJobs to go out with a null token even if this
    // effect ever fires in the same tick authLoading resolves but before
    // token has committed — a null token here just means "signed out."
    if (!token) {
      setJobs([]);
      setLoading(false);
      return;
    }
    load();
  }, [authLoading, token, load]);

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
