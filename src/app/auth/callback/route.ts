import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)

  const response = NextResponse.redirect(new URL('/home', request.url))

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value
        },
        set(name, value, options) {
          response.cookies.set({ name, value, ...options })
        },
        remove(name, options) {
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // Exchange OAuth code for session
  await supabase.auth.exchangeCodeForSession(
    requestUrl.searchParams.get('code')!
  )

  // Get logged in user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Auto-create profile for Google users
  if (user) {
    await supabase.from('profiles').upsert({
      id: user.id,
      full_name: user.user_metadata.full_name || user.email,
    })
  }

  return response
}
