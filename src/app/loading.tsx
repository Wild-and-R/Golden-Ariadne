export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black text-yellow-400">
      {/* Spinner */}
      <div className="mb-6 h-16 w-16 animate-spin rounded-full border-4 border-yellow-500 border-t-transparent"></div>

      {/* Brand Name */}
      <h1 className="text-3xl font-bold tracking-wide text-yellow-400">
        Golden Ariadne
      </h1>

      {/* Subtitle */}
      <p className="mt-3 text-sm text-yellow-300 animate-pulse">
        Crafting your experience...
      </p>
    </div>
  )
}
