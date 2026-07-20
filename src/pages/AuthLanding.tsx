import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { supabase } from '../lib/supabase'

export function AuthLanding() {
  const navigate = useNavigate()

  useEffect(() => {
    async function decide() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/sign-in', { replace: true })
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('slug, role, onboarded')
        .eq('id', user.id)
        .single()

      if (!profile) {
        navigate('/sign-in', { replace: true })
        return
      }

      if (!profile.onboarded) {
        navigate('/onboarding', { replace: true })
        return
      }

      navigate(profile.role === 'store' ? '/' : `/players/${profile.slug}`, { replace: true })
    }

    decide()
  }, [navigate])

  return null
}
