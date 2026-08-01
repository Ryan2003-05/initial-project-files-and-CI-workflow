// ================================================
// NETWORK DETECTOR — RyanTask's
// Sync automatique au retour de la connexion
// ================================================

import NetInfo from '@react-native-community/netinfo'
import { SyncEngine } from './SyncEngine'

let wasOffline = false

export function startNetworkDetector(): () => void {
  const unsubscribe = NetInfo.addEventListener(async state => {
    const isOnline = !!(state.isConnected && state.isInternetReachable)

    if (isOnline && wasOffline) {
      console.log('[Network] Connexion rétablie — synchronisation automatique')
      await SyncEngine.sync()
    }

    wasOffline = !isOnline
  })

  return unsubscribe
}

export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch()
  return !!(state.isConnected && state.isInternetReachable)
}