import { PlayerEditForm } from './PlayerEditForm'
import { StoreEditForm } from './StoreEditForm'
import type { Database } from '../types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']
type PlayerRow = Database['public']['Tables']['players']['Row']
type StoreRow = Database['public']['Tables']['stores']['Row']
type OfferConditions = Database['public']['Tables']['pro_offer_conditions']['Row']

interface SaveUpdates {
  profile: Partial<Profile>
  player: Partial<PlayerRow> | null
  store: Partial<StoreRow> | null
  offerConditions: { pricing_type: string; unit_price_amount: number | null; notes: string } | null
}

interface ProfileEditFormProps {
  profile: Profile
  player: PlayerRow | null
  store: StoreRow | null
  offerConditions: OfferConditions | null
  onSave: (updates: SaveUpdates) => Promise<void>
}

export function ProfileEditForm({ profile, player, store, offerConditions, onSave }: ProfileEditFormProps) {
  if (profile.role === 'store') {
    return <StoreEditForm profile={profile} store={store} onSave={onSave} />
  }
  return <PlayerEditForm profile={profile} player={player} offerConditions={offerConditions} onSave={onSave} />
}
