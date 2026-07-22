import { apiFetch } from './client';

export type Challenge = {
  id: string;
  postedBy: number;
  title: string;
  description: string;
  prize: number | null;
  deadline: string | null;
  status: 'ACTIVE' | 'CLOSED';
  createdAt: string;
  postedByName: string;
};

type ChallengeApiResponse = {
  id: number;
  postedBy: number;
  title: string;
  description: string | null;
  prize: number | null;
  deadline: string | null;
  status: 'ACTIVE' | 'CLOSED';
  createdAt: string;
  postedByName: string | null;
};

function toChallenge(res: ChallengeApiResponse): Challenge {
  return {
    id: String(res.id),
    postedBy: res.postedBy,
    title: res.title,
    description: res.description ?? '',
    prize: res.prize,
    deadline: res.deadline,
    status: res.status,
    createdAt: res.createdAt,
    postedByName: res.postedByName ?? 'Admin',
  };
}

export async function fetchChallenges(token: string, status?: string): Promise<Challenge[]> {
  const url = status ? `/api/challenges?status=${status}` : '/api/challenges';
  const data = await apiFetch<ChallengeApiResponse[]>(url, { token });
  return data.map(toChallenge);
}

export async function createChallenge(
  token: string,
  payload: {
    title: string;
    description: string;
    prize?: number;
    deadline?: string;
  }
): Promise<Challenge> {
  const data = await apiFetch<ChallengeApiResponse>('/api/challenges', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
  return toChallenge(data);
}

export async function updateChallengeStatus(
  token: string,
  id: string,
  status: string
): Promise<Challenge> {
  const data = await apiFetch<ChallengeApiResponse>(`/api/challenges/${id}/status`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({ status }),
  });
  return toChallenge(data);
}
