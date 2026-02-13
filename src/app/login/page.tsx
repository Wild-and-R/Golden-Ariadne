'use client'

import { useState, useEffect } from 'react'
import type { SubmitEventHandler } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const searchParams = useSearchParams()

  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setIsSignUp(searchParams.get('mode') === 'signup')
  }, [searchParams])

  // Google Login
  const handleGoogleLogin = async () => {
    setLoading(true)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    })

    if (error) {
      alert(error.message)
      setLoading(false)
    }
  }

  // Email/Password Auth
  const handleAuth: SubmitEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault()
    setLoading(true)

    const { data: authData, error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      alert(error.message)
      setLoading(false)
      return
    }

    // Create profile if signing up
    if (isSignUp && authData.user) {
      await supabase.from('profiles').upsert({
        id: authData.user.id,
        full_name: fullName,
      })
    }

    router.push('/home')
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4 py-12">
      <form
        onSubmit={handleAuth}
        className="w-full max-w-md rounded-xl bg-gradient-to-br from-yellow-700 via-yellow-500 to-yellow-700 p-8 shadow-lg"
      >
        <h1 className="mb-8 text-center text-3xl font-bold text-black">
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </h1>

        {/* Google Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="mb-4 flex w-full items-center justify-center gap-3 rounded-md border border-yellow-500 bg-black px-4 py-3 text-lg font-semibold text-yellow-400 transition hover:bg-yellow-400 hover:text-black disabled:opacity-70"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 48 48"
            className="h-6 w-6"
          >
            <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.927 32.659 29.421 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.953 3.047l5.657-5.657C34.133 6.053 29.325 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
            <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 16.108 19.003 13 24 13c3.059 0 5.842 1.154 7.953 3.047l5.657-5.657C34.133 6.053 29.325 4 24 4c-7.732 0-14.41 4.388-17.694 10.691z"/>
            <path fill="#4CAF50" d="M24 44c5.291 0 10.067-2.021 13.657-5.291l-6.309-5.336C29.401 34.91 26.805 36 24 36c-5.398 0-9.895-3.317-11.294-7.946l-6.53 5.033C9.432 39.556 16.227 44 24 44z"/>
            <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-1.06 3.12-3.122 5.734-5.955 7.373l6.309 5.336C39.95 36.73 44 30.83 44 24c0-1.341-.138-2.65-.389-3.917z"/>
          </svg>

          Continue with Google
        </button>

        <div className="my-4 flex items-center">
          <div className="h-px flex-1 bg-black"></div>
          <span className="px-3 text-sm font-semibold text-black">OR</span>
          <div className="h-px flex-1 bg-black"></div>
        </div>

        <label htmlFor="email" className="mb-2 block font-semibold text-black">
          Email
        </label>
        <input
          id="email"
          type="email"
          placeholder="you@example.com"
          className="mb-6 w-full rounded-md border border-black bg-black px-4 py-3 text-yellow-400 placeholder-yellow-500 focus:outline-none focus:ring-4 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-black"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label htmlFor="password" className="mb-2 block font-semibold text-black">
          Password
        </label>
        <input
          id="password"
          type="password"
          placeholder="••••••••"
          className="mb-6 w-full rounded-md border border-black bg-black px-4 py-3 text-yellow-400 placeholder-yellow-500 focus:outline-none focus:ring-4 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-black"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {isSignUp && (
          <>
            <label htmlFor="fullName" className="mb-2 block font-semibold text-black">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              placeholder="John Doe"
              className="mb-6 w-full rounded-md border border-black bg-black px-4 py-3 text-yellow-400 placeholder-yellow-500 focus:outline-none focus:ring-4 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-black"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mb-6 w-full rounded-md bg-black px-4 py-3 text-lg font-semibold text-yellow-400 transition hover:bg-yellow-400 hover:text-black disabled:opacity-70"
        >
          {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Log In'}
        </button>

        <p className="text-center text-sm text-yellow-200">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="font-semibold underline underline-offset-2 hover:text-yellow-300"
          >
            {isSignUp ? 'Log In' : 'Sign Up'}
          </button>
        </p>
      </form>
    </div>
  )
}