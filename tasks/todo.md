# Event polls (Случувања) — editor-authored, single-choice, anyone votes

Mirror the existing "interest" feature: Sanity authors the poll, votes live in
Postgres keyed by the Sanity `_id`, all access via a service-role route.

## Plan
- [x] Sanity `cityEvent.poll` — optional object: `question` + `options[]{label}`
      (options are objects so each gets a stable `_key` → survives reordering).
- [x] Postgres migration `add_event_poll.sql` — `event_poll_votes`
      (event_id text, option_key text, user_id/visitor_id actor dedup,
      one vote per actor per event). RLS on, no policies (service-role only).
- [x] API `app/api/events/poll/route.ts` — GET ?eventId → tallies by option_key;
      POST {eventId, optionKey, action:"vote"|"remove", visitorId} → fresh tallies.
- [x] Web: `poll` on SanityEvent + EVENT_FIELDS; `EventPoll` client component;
      rendered on the event detail page AND the explorer modal.
- [x] Mobile: `poll` on SanityEvent + EVENT_FIELDS; `useEventPoll` hook +
      `EventPoll` component; rendered in EventDetailContent.
- [x] Typecheck web + mobile — both EXIT 0.

## Review
Built, not deployed. Deploy has 4 gated steps (see chat). The applause-button
egress backfill (scripts/recache-storage.mjs) is still un-run.

## Notes
- Single-choice: one row per actor; switching options updates that row.
- Retract allowed (tap your current option again → remove).
- Deploy needs: Sanity schema deploy + DB migration + Vercel route + mobile OTA.
