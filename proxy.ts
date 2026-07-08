import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_ROUTES = ['/fund/propose', '/ideas/new']

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()

  // A stale/expired session leaves a dead refresh token in the cookies, which the
  // browser keeps resending — so getUser() returns refresh_token_not_found on
  // EVERY request until the cookie is cleared. Drop the auth cookies once so the
  // session self-heals (user is simply treated as logged out) instead of the
  // error repeating in the logs forever.
  if (
    error &&
    (error.code === 'refresh_token_not_found' ||
      error.code === 'refresh_token_already_used' ||
      error.message?.includes('Refresh Token'))
  ) {
    for (const cookie of request.cookies.getAll()) {
      if (cookie.name.startsWith('sb-') && cookie.name.includes('auth-token')) {
        supabaseResponse.cookies.set(cookie.name, '', { maxAge: 0, path: '/' })
      }
    }
  }

  const isProtected = PROTECTED_ROUTES.some(route =>
    request.nextUrl.pathname.startsWith(route)
  )

  if (isProtected && !user) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}

export const config = {
  // Only run on real page navigations. API routes do their own auth, and the
  // live bus map polls /api/buses/positions every ~30s per viewer — letting the
  // middleware (which makes a Supabase getUser() network call) run on those polls
  // and on the analytics beacon was burning Edge Requests + Function Invocations
  // for nothing. Static assets, _next, and _vercel (analytics) are excluded too.
  matcher: [
    '/((?!api|_next/static|_next/image|_vercel|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?|ttf|map)$).*)',
  ],
}
