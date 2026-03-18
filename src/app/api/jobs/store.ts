// Global job store - persists across requests
// In production, use Redis or database

export interface Job {
  id: string;
  title: string;
  status: 'processing' | 'completed' | 'failed';
  createdAt: number; // timestamp in ms
  htmlContent?: string;
  error?: string;
  userId?: number;
}

// Global store
declare global {
  var webgenzJobs: Map<string, Job> | undefined;
}

// Initialize global store if not exists
if (!globalThis.webgenzJobs) {
  globalThis.webgenzJobs = new Map<string, Job>();
}

export const jobStore = globalThis.webgenzJobs;

// Helper functions
export function createJob(id: string, title: string, userId?: number): Job {
  const job: Job = {
    id,
    title,
    status: 'processing',
    createdAt: Date.now(),
    userId
  };
  jobStore.set(id, job);
  return job;
}

export function getJob(id: string): Job | undefined {
  return jobStore.get(id);
}

export function updateJob(id: string, updates: Partial<Job>): Job | undefined {
  const job = jobStore.get(id);
  if (job) {
    const updated = { ...job, ...updates };
    jobStore.set(id, updated);
    return updated;
  }
  return undefined;
}

export function deleteJob(id: string): boolean {
  return jobStore.delete(id);
}

export function getAllJobs(): Job[] {
  return Array.from(jobStore.values());
}

export function getJobsByUser(userId: number): Job[] {
  return getAllJobs().filter(job => job.userId === userId);
}

// Clean up old jobs (older than 1 hour)
export function cleanupOldJobs(): void {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [id, job] of jobStore.entries()) {
    if (job.createdAt < oneHourAgo) {
      jobStore.delete(id);
    }
  }
}
