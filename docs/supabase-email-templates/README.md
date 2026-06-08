# Supabase Auth email templates (Macedonian)

Branded, mobile-friendly HTML for the Supabase auth emails. Copy each file's
contents into **Supabase dashboard → Authentication → Email Templates**, paste
the matching subject line, and save.

| Supabase template      | File                  | Subject (Наслов)                              |
| ---------------------- | --------------------- | --------------------------------------------- |
| **Confirm signup**     | `confirm-signup.html` | `Потврдете ја вашата адреса — Мој Прилеп`      |
| **Magic Link**         | `magic-link.html`     | `Вашиот линк за најава — Мој Прилеп`           |
| **Reset Password**     | `reset-password.html` | `Ресетирање на лозинката — Мој Прилеп`         |
| **Invite user**        | `invite.html`         | `Покана да се придружите на Мој Прилеп`        |

## Before you rely on these

1. **Configure custom SMTP first** (Authentication → Settings → SMTP). The
   built-in Supabase mailer is rate-limited (~3–4/hour) and meant for dev only —
   on launch day confirmation/reset emails will silently fail without your own
   SMTP (Resend, Brevo, etc.). Set the sender to e.g.
   `Мој Прилеп <no-reply@mojprilep.mk>`.
2. **Set the Site URL** (Authentication → URL Configuration) to
   `https://mojprilep.mk` and add it to the redirect allowlist, so
   `{{ .ConfirmationURL }}` points at production rather than localhost.

## Template variables used

- `{{ .ConfirmationURL }}` — the action link (confirm / log in / reset / accept).
- `{{ .SiteURL }}` — used in the footer link.

The templates degrade gracefully: if a user's email client blocks the button,
the raw link is shown beneath it.
