# Lessons learned

Patterns and corrections from past work on **Мој Прилеп**. Read this at
the start of every session so we don't repeat past mistakes.

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
