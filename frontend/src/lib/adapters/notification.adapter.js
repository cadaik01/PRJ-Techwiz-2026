/** Current model fields + leftover serializer (verb / audience / payload). */

function isPayloadRecord(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function parsePayload(payload) {
  if (!payload) return {};
  if (typeof payload === 'string') {
    try {
      const parsed = JSON.parse(payload);
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

export function adaptNotification(raw) {
  const payload = parsePayload(raw.payload);
  const type = raw.type ?? raw.verb ?? 'ORDER_PLACED';

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

export function adaptNotificationList(items) {
  return items.map(adaptNotification);
}

export function adaptNotificationPage(page) {
  return {
    ...page,
    results: adaptNotificationList(page.results),
  };
}
