# Tasks

Active and upcoming work for the **Мој Прилеп** civic platform.

Format: top section is the active sprint. Done items move under "Recently
completed" and roll out after a week or two. Anything still being thought
about lives in "Backlog / ideas".

---

## Active

_(empty — add items here when starting a sprint)_

---

## Recently completed

- **Phase 1** — local Prilep street database + Fuse.js autocomplete.
- **Phase 2** — MapLibre + OpenFreeMap pin picker; Nominatim reverse-geocode
  normalized through local canonical street matcher.
- **Phase 3** — PostGIS-backed duplicate detection (`find_similar_issues`
  RPC) with hybrid street/proximity scoring; non-blocking alert card.
- **Nav restructure** — Platforma section expanded with Мој Прилеп / Наши
  Проекти / Партнери; Информации reduced to Позитива + Случувања;
  Претпријатие adds Градски превоз + Паркинзи.
- **Category cleanup** — `power` → "Осветлување"; added `negligent`
  (Несовесни граѓани) replacing `violation`; added `transport` + `parking`.
- **Security hardening** — function search_path locked, utility_posts
  admin-only writes, avatars bucket no longer listable.
- **Cloudflare CDN** — `cdn.mojprilep.mk` Worker proxying Supabase Storage;
  ~10× egress reduction.
- **Vertical column dividers removed** in Shell.

---

## Backlog / ideas

### Mobile app
- Expo / React Native project once web has stabilized.
- Push notifications via FCM (Edge Function → FCM HTTP v1 API).
- Deep links for `/issues/<slug>-<id>` to open the app.

### Content / CMS
- `news_posts` table + simple admin form with TipTap rich text editor.
- Categories matching the sidebar (`positive`, `projects`, `info`,
  `sponsors`, `events`) so each page just queries the table.

### Maps
- Optional Google Maps satellite layer behind the $200 nonprofit credit.
- Street-level lat/lng index for the local DB (so we don't depend on
  Nominatim's lookup for autocomplete-only flows).

### Email
- Resend custom SMTP wired into Supabase Auth.
- Google Workspace for Nonprofits — verify domain, add MX + DKIM.

### Duplicate detection v2
- Show distance with a small inline map preview in the alert card.
- "Поддржи го постоечкиот" auto-marks user as affected on click.

### Admin
- `/admin` dashboard for moderation actions (pending change requests,
  flag reports, etc.).
- Audit log for admin actions on issues.

### Polish
- Move PostGIS extension out of `public` schema once we have a quiet
  hour to test all proximity queries against the new search_path.
- Migrate avatars upload paths to `userId/avatar.jpg` consistently.

---

## Review log

_(Append a brief retrospective after closing each sprint here.)_
