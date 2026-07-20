import { supabase } from '../lib/supabase'

export function SignInPage() {
  async function handleGoogleSignIn() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/me` },
    })
  }

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-6 font-tl-sans">
      <div className="w-full max-w-sm text-center">
        <h1 className="font-display text-2xl font-bold text-chalk mb-8 uppercase tracking-wide">
          Sign in
        </h1>
        <button
          onClick={handleGoogleSignIn}
          className="w-full font-tl-mono text-sm font-semibold tracking-wide text-ink bg-chalk px-4 py-3 rounded-sm hover:opacity-90 transition-opacity"
        >
          Googleでサインイン
        </button>
      </div>
    </div>
  )
}
