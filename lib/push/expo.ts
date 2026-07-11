// Minimal Expo Push API client.
//
// Sends notifications to Expo push tokens via https://exp.host/--/api/v2/push/send.
// No SDK dependency — the endpoint is a plain JSON POST that accepts up to 100
// messages per request, so we chunk. Expo also recommends gzip + an access
// token, but neither is required; we keep it dependency-free.

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const CHUNK = 100;

export type PushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  channelId?: string;
};

export type PushTicket = { status: "ok" | "error"; id?: string; message?: string; details?: unknown };

/** Send a batch of messages, chunked. Returns the flattened tickets array. */
export async function sendExpoPush(messages: PushMessage[]): Promise<PushTicket[]> {
  const tickets: PushTicket[] = [];

  for (let i = 0; i < messages.length; i += CHUNK) {
    const chunk = messages.slice(i, i + CHUNK);
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(chunk.map((m) => ({ sound: "default", ...m }))),
    });

    const json = (await res.json().catch(() => ({}))) as { data?: PushTicket[] };
    if (Array.isArray(json.data)) tickets.push(...json.data);
  }

  return tickets;
}
