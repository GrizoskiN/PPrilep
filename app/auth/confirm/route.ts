import { createClient } from '../../../lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

// Email OTP verification for magic links, signup confirmation, recovery and
// email-change — using the token_hash flow.
//
// WHY this exists alongside /auth/callback:
//   /auth/callback uses PKCE exchangeCodeForSession(code), which needs the
//   `code_verifier` cookie set in the SAME browser that requested the link.
//   That breaks the common "request the magic link on my laptop, open it on my
//   phone" case (and Gmail/in-app browsers that open links in a different
//   webview). verifyOtp({ token_hash }) carries no such cookie dependency, so
//   it works cross-device.
//
//   OAuth (Google) still flows through /auth/callback — it legitimately uses
//   the ?code= PKCE exchange and always completes in the same browser.
//
// The email templates point here as:
//   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/<path>

const VALID_TYPES = new Set<EmailOtpType>([
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
])

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  // Only honour same-origin relative paths as the post-login destination, so a
  // crafted ?next=https://evil.example can't turn this into an open redirect.
  const nextParam = searchParams.get('next') ?? '/'
  const next = nextParam.startsWith('/') ? nextParam : '/'

  if (token_hash && type && VALID_TYPES.has(type as EmailOtpType)) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash,
    })
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`)
}
