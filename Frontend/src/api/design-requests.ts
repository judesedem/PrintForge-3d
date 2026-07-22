import { apiFetch } from './client';

export type DesignRequest = {
  id: string;
  userId: number;
  title: string;
  description: string;
  budget: number | null;
  deadline: string | null;
  status: 'OPEN' | 'ACCEPTED' | 'FULFILLED' | 'CANCELLED';
  createdAt: string;
  userName: string;
  designerId?: number;
  designerName?: string;
  fileId?: number;
};

type DesignRequestApiResponse = {
  id: number;
  userId: number;
  title: string;
  description: string | null;
  budget: number | null;
  deadline: string | null;
  status: 'OPEN' | 'ACCEPTED' | 'FULFILLED' | 'CANCELLED';
  createdAt: string;
  userName: string | null;
  designerId?: number | null;
  designerName?: string | null;
  fileId?: number | null;
};

function toDesignRequest(res: DesignRequestApiResponse): DesignRequest {
  return {
    id: String(res.id),
    userId: res.userId,
    title: res.title,
    description: res.description ?? '',
    budget: res.budget,
    deadline: res.deadline,
    status: res.status,
    createdAt: res.createdAt,
    userName: res.userName ?? 'Unknown User',
    designerId: res.designerId ?? undefined,
    designerName: res.designerName ?? undefined,
    fileId: res.fileId ?? undefined,
  };
}

export async function fetchDesignRequests(token: string, status?: string): Promise<DesignRequest[]> {
  const url = status ? `/api/design-requests?status=${status}` : '/api/design-requests';
  const data = await apiFetch<DesignRequestApiResponse[]>(url, { token });
  return data.map(toDesignRequest);
}

export async function createDesignRequest(
  token: string,
  payload: {
    title: string;
    description: string;
    budget?: number;
    deadline?: string;
  }
): Promise<DesignRequest> {
  const data = await apiFetch<DesignRequestApiResponse>('/api/design-requests', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
  return toDesignRequest(data);
}

export async function updateDesignRequestStatus(
  token: string,
  id: string,
  status: string
): Promise<DesignRequest> {
  const data = await apiFetch<DesignRequestApiResponse>(`/api/design-requests/${id}/status`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({ status }),
  });
  return toDesignRequest(data);
}

export async function fetchAcceptedRequests(token: string): Promise<DesignRequest[]> {
  const data = await apiFetch<DesignRequestApiResponse[]>('/api/design-requests/my-accepted-requests', { token });
  return data.map(toDesignRequest);
}

export async function fetchMyRequests(token: string): Promise<DesignRequest[]> {
  const data = await apiFetch<DesignRequestApiResponse[]>('/api/design-requests/my-requests', { token });
  return data.map(toDesignRequest);
}

export async function acceptDesignRequest(token: string, id: string): Promise<DesignRequest> {
  const data = await apiFetch<DesignRequestApiResponse>(`/api/design-requests/${id}/accept`, {
    method: 'PATCH',
    token,
  });
  return toDesignRequest(data);
}

export async function deliverDesignRequest(token: string, id: string, fileId: string): Promise<DesignRequest> {
  const data = await apiFetch<DesignRequestApiResponse>(`/api/design-requests/${id}/deliver`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({ fileId }),
  });
  return toDesignRequest(data);
}
