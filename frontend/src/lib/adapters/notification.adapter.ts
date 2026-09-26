import type { NotificationItem, NotificationType, PaginatedData } from '@/types';

type BeNotificationPayload = {
  message?: string;
  body?: string;
  title?: string;
  target_url?: string;
  url?: string;
  link?: string;
};

/** Current model fields + leftover serializer (verb / audience / payload). */
export type BeNotification = {
  id: number;
  type?: string;
  verb?: string;
  audience?: string;
  title?: string;
  message?: string;
  target_url?: string | null;
  payload?: BeNotificationPayload | string | null;
  is_read?: boolean;
  read_at?: string | null;
  created_at?: string;
};

function isPayloadRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function parsePayload(payload: BeNotification['payload']): BeNotificationPayload {
  if (!payload) return {};
  if (typeof payload === 'string') {
    try {
      const parsed: unknown = JSON.parse(payload);
      if (!isPayloadRecord(parsed)) {
        return { message: payload };
      }
      return {
        message: typeof parsed.message === 'string' ? parsed.message : undefined,
        body: typeof parsed.body === 'string' ? parsed.body : undefined,
        title: typeof parsed.title === 'string' ? parsed.title : undefined,
        target_url: typeof parsed.target_url === 'string' ? parsed.target_url : undefined,
        url: typeof parsed.url === 'string' ? parsed.url : undefined,
        link: typeof parsed.link === 'string' ? parsed.link : undefined,
      };
    } catch {
      return { message: payload };
    }
  }
  return payload;
}

export function adaptNotification(raw: BeNotification): NotificationItem {
  const payload = parsePayload(raw.payload);
  const type: NotificationType | string = raw.type ?? raw.verb ?? 'ORDER_PLACED';

  const title =
    (raw.title && raw.title.trim()) ||
    (payload.title && payload.title.trim()) ||
    (raw.verb && raw.verb.trim()) ||
    type;

  const message =
    (raw.message && raw.message.trim()) ||
    (payload.message && payload.message.trim()) ||
    (payload.body && payload.body.trim()) ||
    (raw.audience ? `Audience: ${raw.audience}` : '') ||
    '';

  const target_url =
    raw.target_url ?? payload.target_url ?? payload.url ?? payload.link ?? null;

  return {
    id: raw.id,
    type,
    title,
    message,
    target_url,
    is_read: Boolean(raw.is_read),
    read_at: raw.read_at ?? null,
    created_at: raw.created_at ?? new Date().toISOString(),
  };
}

export function adaptNotificationList(items: BeNotification[]): NotificationItem[] {
  return items.map(adaptNotification);
}

export function adaptNotificationPage(
  page: PaginatedData<BeNotification>,
): PaginatedData<NotificationItem> {
  return {
    ...page,
    results: adaptNotificationList(page.results),
  };
}
