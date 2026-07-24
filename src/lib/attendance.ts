import { supabase } from './supabase'

export async function clockIn(storeId: string, playerId: string) {
  await supabase.from('store_staff_attendance_logs').insert({ store_id: storeId, player_id: playerId })
}

export async function clockOut(storeId: string, playerId: string) {
  await supabase
    .from('store_staff_attendance_logs')
    .update({ clocked_out_at: new Date().toISOString() })
    .eq('store_id', storeId)
    .eq('player_id', playerId)
    .is('clocked_out_at', null)
}
