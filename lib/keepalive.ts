import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from './supabase'

const FOUR_DAYS_MS = 4 * 24 * 60 * 60 * 1000

export async function keepSupabaseAlive(): Promise<void> {
  try {
    const lastPing = await AsyncStorage.getItem('last_supabase_ping')
    const now = Date.now()

    if (!lastPing || now - parseInt(lastPing) > FOUR_DAYS_MS) {
      await supabase
        .from('tasks')
        .select('count', { count: 'exact', head: true })

      await AsyncStorage.setItem('last_supabase_ping', now.toString())
      console.log('[Keepalive] Ping Supabase envoyé')
    }
  } catch (e) {
    console.warn('[Keepalive] Ping échoué (réseau indisponible)')
  }
}