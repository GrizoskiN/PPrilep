const MIN_VIEW_INCREMENT_INTERVAL_MS = 10000;
const inFlight = new Map<string, Promise<number | null>>();

function getLastIncrementAt(issueId: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.sessionStorage.getItem(`issue_view_last:${issueId}`);
    if (!raw) return 0;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

function setLastIncrementAt(issueId: string, value: number) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(`issue_view_last:${issueId}`, String(value));
  } catch {
    // Ignore storage errors (private mode, blocked storage, etc.)
  }
}

export async function incrementIssueViews(
  issueId: string | number,
): Promise<number | null> {
  if (
    issueId === null ||
    issueId === undefined ||
    typeof window === "undefined"
  ) {
    return null;
  }

  const issueKey = String(issueId);

  const now = Date.now();
  const lastAt = getLastIncrementAt(issueKey);
  if (now - lastAt < MIN_VIEW_INCREMENT_INTERVAL_MS) {
    return null;
  }

  const ongoing = inFlight.get(issueKey);
  if (ongoing) return ongoing;

  // Lock immediately to avoid duplicate bumps from strict-mode remounts/effects.
  setLastIncrementAt(issueKey, now);

  const promise = import("./supabase/client")
    .then(({ createClient }) => {
      const supabase = createClient();
      return supabase.rpc("increment_issue_views", { p_issue_id: issueId });
    })
    .then(({ data, error }) => {
      if (error) {
        // Roll back lock so a later attempt can retry.
        setLastIncrementAt(issueKey, 0);
        return null;
      }
      return typeof data === "number" ? data : null;
    })
    .catch(() => {
      setLastIncrementAt(issueKey, 0);
      return null;
    })
    .finally(() => {
      inFlight.delete(issueKey);
    });

  inFlight.set(issueKey, promise);
  return promise;
}
