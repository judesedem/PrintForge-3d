import { apiFetch } from './client';

// Mirrors notificationservice/model/Notification.java's JSON output exactly.
// Unlike jobs.ts's PrintJobResponse, there is no DTO layer here — the
// controller returns the JPA entity directly (see NotificationController's
// List<Notification> return types), so field names follow Jackson's default
// bean-property rules rather than an explicit @JsonProperty mapping:
// camelCase getters serialize as-is, and the isRead() boolean getter
// serializes as "read" (Jackson strips the "is" prefix and lowercases the
// next letter). createdAt is a LocalDateTime, serialized as an ISO-8601
// string since Spring Boot's auto-configured JavaTimeModule has
// WRITE_DATES_AS_TIMESTAMPS disabled by default. Keep in sync manually if
// the backend ever wraps this entity in an explicit response DTO.
export type NotificationApiResponse = {
  id: number;
  userId: number;
  title: string;
  message: string;
  /** Free-text on the backend (Notification.java's comment gives "ORDER_UPDATE" / "SYSTEM_ALERT" / "PROMO" as examples) — not a closed enum, so treat unknown values as expected. */
  type: string;
  read: boolean;
  createdAt: string;
};

export type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
};

export function toNotification(res: NotificationApiResponse): Notification {
  return {
    id: String(res.id),
    title: res.title,
    message: res.message,
    type: res.type,
    read: res.read,
    createdAt: res.createdAt,
  };
}

/**
 * Maps to GET /api/notifications. NotificationController.getMyNotifications
 * resolves the caller from the JWT (Authentication → UserRepository lookup),
 * the same pattern as GET /api/auth/me — no userId needed from the client.
 * The controller also exposes GET /api/notifications/user/{userId}, but its
 * own comment marks that as "kept for backward compatibility with existing
 * controller tests," so this uses the JWT-derived route instead.
 */
export async function fetchNotifications(token: string): Promise<Notification[]> {
  const data = await apiFetch<NotificationApiResponse[]>('/api/notifications', { token });
  return data.map(toNotification);
}

/**
 * Maps to GET /api/notifications/user/{userId}/unread/count. Unlike
 * fetchNotifications, the backend has no JWT-only route for this one —
 * only the /user/{userId} form exists (requireSelfOrStaff-checked) — so the
 * caller must supply userId explicitly. Pass appUser.user_id from
 * useSession().
 */
export async function fetchUnreadCount(token: string, userId: number): Promise<number> {
  const data = await apiFetch<{ unreadCount: number }>(
    `/api/notifications/user/${userId}/unread/count`,
    { token }
  );
  return data.unreadCount;
}

/**
 * Maps to PATCH /api/notifications/{notificationId}/read.
 */
export async function markAsRead(token: string, notificationId: string): Promise<Notification> {
  const data = await apiFetch<NotificationApiResponse>(
    `/api/notifications/${notificationId}/read`,
    { method: 'PATCH', token }
  );
  return toNotification(data);
}

/**
 * Maps to PATCH /api/notifications/read-all — JWT-derived, same reasoning
 * as fetchNotifications: the controller's own comment marks this as the
 * route the frontend should call, with /user/{userId}/read-all kept only
 * for backward compatibility.
 */
export function markAllAsRead(token: string): Promise<{ status: string }> {
  return apiFetch<{ status: string }>('/api/notifications/read-all', {
    method: 'PATCH',
    token,
  });
}

/**
 * Maps to POST /api/notifications/push-token. Note: as of this writing the
 * backend handler (NotificationController.registerPushToken) accepts the
 * request body but never reads it — "would store against the user for push
 * delivery here" is still a server-side TODO. Sending the token now means
 * nothing needs to change on the frontend once that's implemented.
 */
export function registerPushToken(token: string, pushToken: string): Promise<{ status: string }> {
  return apiFetch<{ status: string }>('/api/notifications/push-token', {
    method: 'POST',
    token,
    body: { pushToken },
  });
}
