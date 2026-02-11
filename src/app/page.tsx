'use client'

import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-yellow-400 font-sans">
      <h1 className="mb-6 max-w-md text-center text-5xl font-extrabold tracking-wide text-yellow-400 drop-shadow-[0_2px_8px_rgba(255,215,0,0.7)]">
        Welcome to <span className="text-yellow-300">Golden Ariadne</span>
      </h1>

      <p className="mb-12 max-w-lg text-center text-lg leading-relaxed text-yellow-400/90">
        Discover exquisite, handcrafted jewelry inspired by the legend of Ariadne.
        Elegant, timeless, and crafted just for you.
      </p>

      <div className="flex gap-6">
        <button
          onClick={() => router.push('/login')}
          className="rounded-md border-2 border-yellow-400 bg-black px-8 py-3 text-lg font-semibold text-yellow-400 transition hover:bg-yellow-400 hover:text-black"
        >
          Log In
        </button>

        <button
          onClick={() => router.push('/login?mode=signup')}
          className="rounded-md bg-gradient-to-r from-yellow-700 via-yellow-500 to-yellow-700 px-8 py-3 text-lg font-semibold text-black shadow-lg transition hover:brightness-110"
        >
          Sign Up
        </button>
      </div>
    </main>
  )
}
