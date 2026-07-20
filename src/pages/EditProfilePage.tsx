import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { supabase } from '../lib/supabase'
import { ProfileEditForm } from '../components/ProfileEditForm'
import type { Database } from '../types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']
type OfferConditions = Database['public']['Tables']['pro_offer_conditions']['Row']

export function EditProfilePage() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [offerConditions, setOfferConditions] = useState<OfferConditions | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'signed-out'>('loading')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setStatus('signed-out')
        return
      }

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      const { data: offerData } = await supabase
        .from('pro_offer_conditions')
        .select('*')
        .eq('pro_id', user.id)
        .maybeSingle()

      if (profileData) setProfile(profileData)
      setOfferConditions(offerData ?? null)
      setStatus('ready')
    }

    load()
  }, [])

  async function handleSave({
    profile: profileUpdates,
    offerConditions: offerUpdates,
  }: {
    profile: Partial<Profile>
    offerConditions: { unit_price: string; notes: string } | null
  }) {
    if (!profile) return
    await supabase.from('profiles').update({ ...profileUpdates, onboarded: true }).eq('id', profile.id)
    if (offerUpdates) {
      await supabase.from('pro_offer_conditions').upsert({
        pro_id: profile.id,
        unit_price: offerUpdates.unit_price,
        notes: offerUpdates.notes,
      })
    }
    navigate(profile.role === 'store' ? '/' : `/players/${profileUpdates.slug ?? profile.slug}`)
  }

  if (status === 'loading') return null
  if (status === 'signed-out') {
    navigate('/sign-in')
    return null
  }
  if (!profile) return null

  return <ProfileEditForm profile={profile} offerConditions={offerConditions} onSave={handleSave} />
}
