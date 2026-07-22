import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { supabase } from '../lib/supabase'
import { ProfileEditForm } from '../components/ProfileEditForm'
import type { Database } from '../types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']
type PlayerRow = Database['public']['Tables']['players']['Row']
type OfferConditions = Database['public']['Tables']['pro_offer_conditions']['Row']

export function EditProfilePage() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [player, setPlayer] = useState<PlayerRow | null>(null)
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
      if (profileData) setProfile(profileData)

      if (profileData?.role === 'player') {
        const { data: playerData } = await supabase.from('players').select('*').eq('id', user.id).maybeSingle()
        setPlayer(playerData)

        const { data: offerData } = await supabase
          .from('pro_offer_conditions')
          .select('*')
          .eq('pro_id', user.id)
          .maybeSingle()
        setOfferConditions(offerData ?? null)
      }

      setStatus('ready')
    }

    load()
  }, [])

  async function handleSave({
    profile: profileUpdates,
    player: playerUpdates,
    offerConditions: offerUpdates,
  }: {
    profile: Partial<Profile>
    player: Partial<PlayerRow> | null
    offerConditions: { pricing_type: string; unit_price_amount: number | null; notes: string } | null
  }) {
    if (!profile) return

    await supabase.from('profiles').update({ ...profileUpdates, onboarded: true }).eq('id', profile.id)

    if (playerUpdates) {
      await supabase.from('players').update(playerUpdates).eq('id', profile.id)
    }

    if (offerUpdates) {
      await supabase.from('pro_offer_conditions').upsert({
        pro_id: profile.id,
        pricing_type: offerUpdates.pricing_type,
        unit_price_amount: offerUpdates.unit_price_amount,
        notes: offerUpdates.notes,
      })
    }

    const finalSlug = profileUpdates.slug ?? profile.slug
    navigate(profile.role === 'store' ? `/stores/${finalSlug}` : `/players/${finalSlug}`)
  }

  if (status === 'loading') return null
  if (status === 'signed-out') {
    navigate('/sign-in')
    return null
  }
  if (!profile) return null

  return (
    <ProfileEditForm
      profile={profile}
      player={player}
      offerConditions={offerConditions}
      onSave={handleSave}
    />
  )
}
