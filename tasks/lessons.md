# Lessons learned

Patterns and corrections from past work on **Мој Прилеп**. Read this at
the start of every session so we don't repeat past mistakes.

---

## PostgREST / Supabase joins (May 2026)

### Always use `profiles:user_id(...)` not `profiles(...)`
- Implicit `profiles(...)` join fails when PostgREST can't auto-detect the FK
  → query returns an error we catch → array stays `[]` → UI shows "нема data"
  despite rows existing in DB. Hardest kind of bug to find.
- ✅ Always qualify: `profiles:user_id(full_name, avatar_url, username)`.
  Applies to `issue_help_offers`, `issue_help_offer_comments`, `issue_comments`,
  `issue_affected`, `issue_helpers`.

### Postgres `date` column rejects ISO-8601 datetime strings
- Storing `"2025-05-20T10:30"` into a `date` column → Postgres error on upsert.
- ✅ Pass only `"YYYY-MM-DD"` (the raw value from `<input type="date">`).
  Fold time into a text `note` field if needed. Consider `timestamptz` column
  if date+time storage is actually required.

---

## React / state (May 2026)

### Optimistic state updates for instant mobile tap feedback
- `await db.call()` then `setState()` feels broken on mobile — color/UI
  doesn't change until the network round-trip completes.
- ✅ Call `setState(!current)` BEFORE the `await`. Revert on error if needed.
  Used for `isAffected`, `isHelper` toggles.

### `flex-1 overflow-y-auto` must pair with `min-h-0`
- Inside a flex column, a `flex-1 overflow-y-auto` child won't scroll unless
  it also has `min-h-0` (allows it to shrink below intrinsic content height).
- ✅ Pattern: `<div class="flex flex-col"><div class="flex-1 min-h-0 overflow-y-auto">`.

### Bottom sheet slide-up animation: two-tick pattern
- Mounting a sheet at `transform: translateY(0)` gives no animation because
  the browser never saw the `translateY(100%)` start state.
- ✅ Mount with translateY(100%), then `requestAnimationFrame(() => setAnimOpen(true))`
  to fire the CSS transition on the next paint.

---

## IssueList / modal (May 2026)

### The X close button was in IssueList's own header, not in IssueDetail
- The X rendered in a separate `<div>` above IssueDetail's own header row,
  causing author + X to be on different rows.
- ✅ Remove IssueList's sticky X header; pass `onClose` prop to `IssueDetail`
  so it places the X inside its own FB-style author row.

### Shared `/issues/[id]` URL needs its own modal-style layout
- The route was wrapped in `Shell` (sidebar nav) — looked nothing like the
  in-feed popup modal.
- ✅ Created `app/issues/[id]/IssuePageClient.tsx` — client wrapper that
  replicates the exact two-panel layout (dark bg + photo + detail on desktop,
  white full-page on mobile). Pass `onClose={() => router.back()}`.
  Add `generateMetadata` for OG previews when links are shared.

Format: brief title → context (one line) → rule. Add to the top when new.

---

## Next.js / React

### "This is NOT the Next.js you know"
- Project uses Next.js 16+ with breaking changes from older versions.
- ALWAYS check `node_modules/next/dist/docs/` before writing routing,
  data-fetching, or component code from memory.

### React Compiler — never call `createClient()` directly in render
- Bare `createClient()` runs every render → memory churn + Supabase
  auth listener weirdness.
- `useRef(createClient()).current` is ALSO wrong — the `createClient()`
  call still happens every render before being passed to `useRef`.
- ✅ Correct: `const supabase = useMemo(() => createClient(), []);`

### setState inside `useEffect` body
- The `react-hooks/set-state-in-effect` lint flags synchronous setState
  calls inside effects → cascading renders.
- ✅ Wrap in `setTimeout(() => setX(...), 0)` and return `clearTimeout`
  in the cleanup. The deferred tick avoids the cascading-render warning
  and is the same pattern used everywhere in IssueDetail.tsx.

### `react-hook-form`'s `watch()` is incompatible with React Compiler
- Lint warns: "this API returns functions which cannot be memoized."
- ✅ Use `useWatch({ control, name: "field" })` for individual subscriptions.

### Component declarations must live at module scope
- "Cannot create components during render" error means a component is
  declared INSIDE another component's function body.
- ✅ Move it to module scope. If it needs state from the parent, pass
  via props or lift the state up.

### `next/image` requires explicit hosts in `next.config.ts`
- New external image hosts (CDN, etc.) must be added to `images.remotePatterns`
  before the optimizer accepts them.
- Local blob URLs from `URL.createObjectURL` can't go through `<Image>` —
  use raw `<img>` with `eslint-disable-next-line @next/next/no-img-element`.

---

## Supabase / Postgres

### RLS + grants are independent layers
- A user can read a table only if BOTH:
  1. They have a `GRANT SELECT` on the table (Data API access).
  2. The RLS policy permits the row.
- As of May/Oct 2026, new tables in `public` aren't auto-granted —
  must `GRANT` explicitly. Existing project's defaults already set via
  `ALTER DEFAULT PRIVILEGES`.

### `SECURITY DEFINER` for trusted writes
- Standard RLS hit "new row violates row-level security policy" too
  often. The fix: a `SECURITY DEFINER` Postgres function called via
  `supabase.rpc(...)` that does the insert with `auth.uid()` enforcement
  inside the function body.
- Used for: `submit_change_request`, `approve_change_request`,
  `reject_change_request`, `get_pending_change_requests`,
  `find_similar_issues`.

### SECURITY DEFINER auth checks: two recurring fail-open traps
Found in the Jun 2026 pre-launch review — `agency_set_issue_status` let
ANY anonymous user change any issue's status. Both traps below applied:
- **NULL comparison fails open.** `if not (is_admin() or reported_by =
  auth.uid() or …)`. For an anon caller `auth.uid()` is NULL, so
  `reported_by = NULL` → NULL, the whole OR → NULL, and `not NULL` → NULL,
  which is NOT true → the `raise exception` is SKIPPED. The guard passes.
  - ✅ Guard `auth.uid()` first: `if auth.uid() is null then raise …`.
    Wrap every equality in `coalesce(a = b, false)`. Never let a NULL reach
    a boolean guard.
- **Default PUBLIC execute grant.** New Postgres functions are
  `EXECUTE`-able by PUBLIC (incl. `anon`) by default. `grant execute … to
  authenticated` only ADDS — it does not remove PUBLIC. So `anon` can call
  every RPC unless you explicitly `revoke execute … from public`.
  - ✅ For every privileged RPC: `revoke execute … from public;` then grant
    only the role that needs it. Verify by calling it with the anon key.
- This is the SAME class as the `membership_tier` self-assign hole — assume
  any new privileged surface is exploitable until proven otherwise with an
  anon-key probe (see `harden_security_prelaunch.sql`).

### Column-level SELECT for PII (not just UPDATE)
- `harden_profiles_rls.sql` revoked UPDATE on privileged columns, but
  `profiles.street_name`/`district` (home location) stayed world-readable
  via the REST API because RLS is row-level, not column-level, and SELECT
  was never restricted.
- ✅ `revoke select (col, …) on public.profiles from anon;` for PII columns.
  Keep `authenticated` if the owner's own page reads them. Residual: a
  logged-in user can still read other users' values — fix with a view or
  SECURITY DEFINER accessor if that matters.

### PostgREST schema cache
- After `CREATE FUNCTION` or `CREATE TABLE`, PostgREST may not see the
  new symbol immediately. Tail every migration with:
  `NOTIFY pgrst, 'reload schema';`

### `OUT` parameters shadow table columns inside PL/pgSQL
- `RETURNS TABLE (id bigint, ...)` causes `id` to be ambiguous inside
  the function body.
- ✅ Always qualify with table alias: `r.id`, `i.title`, etc.

### `category` is a CHECK constraint, not a Postgres ENUM
- `ALTER TYPE category ADD VALUE` fails because no such type exists.
- ✅ Drop and recreate the `CHECK` constraint with the new allowed values.

### `spatial_ref_sys` cannot have RLS toggled
- PostGIS system table owned by the postgres superuser. Supabase
  Security Advisor flags it as a false positive. Mark as resolved /
  ignore.

---

## Maps / geocoding

### Never trust OSM/Nominatim street names directly
- Nominatim returns inconsistent / outdated / combined names for
  Прилеп: e.g. `"Илка Василеска (Присаѓанка)-Божана"` when the canonical
  current name is `"Илка Присаѓанка"`.
- ✅ Always run reverse-geocoded names through `matchStreet()` from
  `lib/data/streets.ts` to normalize to the local canonical entry.
  Falls back to empty if no confident match — never pollutes the form.

### A new single-segment pretty URL must be added to `RESERVED_USERNAMES`
- Added a `/prevoz` rewrite → `/utility/transport`. The page then rendered with
  3 columns + a perpetual right-panel skeleton, only on the pretty URL. Cause:
  the shell picks columns from `pathname`, and `isProfileRoute()` treats ANY
  single-segment path that isn't a reserved username as a `/<username>` profile
  (→ 3-col + sponsor panel). `/prevoz` wasn't reserved → mistaken for a profile.
- ✅ Whenever you add a top-level route segment (especially a rewrite alias),
  add it to `RESERVED_USERNAMES` in `lib/utils.ts`. Then `usesThreeColumns`
  falls through to `THREE_COLUMN_ROUTES` (add it there too if you want 3-col).
  Bonus: also stops anyone registering that word as a username.

### Diagnose layout bugs from the SHELL, not the feature inside it
- "Layout is wrong + GPS wrong" on `/prevoz` looked like a map bug; I wrongly
  blamed the route `line-offset` and removed it. The real cause was the shell
  treating the new single-segment URL as a profile route (see the
  RESERVED_USERNAMES lesson above). The offset is intended and lives fine in
  prod.
- ✅ When a whole page "looks wrong," check column/shell logic
  (`lib/layout.ts`, `Shell.tsx`) FIRST. Don't rip out a feature on a hunch —
  confirm against production (`git show HEAD:<file>`) before reverting.

### Pin reverse-geocoding is best-effort, not authoritative
- If `matchStreet()` returns null, leave the street field empty.
  Don't auto-fill garbage just to put something there.

### Local street DB is the source of truth
- `lib/data/prilep-streets.json` has Cyrillic + Latin + old names +
  search_terms (lowercased, prefix-stripped). Both `StreetAutocomplete`
  and `LocationPickerModal` use the same Fuse index for consistency.

---

## UI / UX

### iOS Safari sticky + `backdrop-blur-md` = transparent bug
- A sticky element with `backdrop-blur-md` can render the bg as fully
  transparent on iOS.
- ✅ Solid bg via Tailwind class + inline `style={{ backgroundColor }}`
  as belt-and-suspenders.

### iOS auto-zoom on inputs under 16px
- Mobile Safari zooms into focused inputs if `font-size < 16px`.
- ✅ Global rule in `globals.css` forces 16px on touch devices for
  `input`, `select`, `textarea`. Use shorter padding to make controls
  appear smaller without changing font size.

### Native `<select>` is unstyleable across iOS/Chromium
- Hover, item radius, panel-width-fit-content all impossible.
- ✅ Use the custom `<FilterSelect>` component for any visible filter
  dropdown. Keeps native `<select>` only inside forms where the wheel
  picker is acceptable UX.

### Cards on mobile: full-bleed, no border-radius
- IssueCard wrapper uses `rounded-none lg:rounded-xl border-y lg:border`
  so cards flow edge-to-edge on phone but feel like cards on desktop.

### BlurImage "stuck skeleton" on cached images
- Next.js `<Image>` doesn't always fire `onLoad` when the image is
  already in the browser cache → image stays at `opacity-0`.
- ✅ In `useEffect`, check `img.complete && img.naturalWidth > 0` and
  flip `loaded` manually. Also add `onError` to drop the skeleton even
  on broken images.

---

## DevOps / build

### `cdnUrl()` helper protects against pre-DNS deploys
- The helper falls back to the original Supabase URL when
  `NEXT_PUBLIC_CDN_HOST` is unset.
- Means: it's safe to deploy the code BEFORE the CDN domain is live.
  Just don't set the env var until SSL is provisioned, or images break.

### Always run `npx tsc --noEmit && npx eslint . --ext .ts,.tsx` before
   declaring a task complete. Exit code 0 from both = clean.

---

## How to add new lessons

When the user corrects something I did:

1. Identify the underlying pattern (not just the specific fix).
2. Add a section here with a short title, the one-line context, and
   the rule.
3. If it overlaps an existing lesson, EDIT that one rather than adding
   a new section. Better one good rule than five overlapping ones.
4. Keep it short. If a lesson grows past ~5 lines, split it.
