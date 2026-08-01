// ================================================
// SYNC BANNER — RyanTask's
// Bannière globale état de synchronisation
// ================================================

import { useEffect, useState, useRef } from 'react'
import { Text, StyleSheet, Animated, Pressable } from 'react-native'
import { syncQueue } from '../lib/sync/SyncQueue'
import { SyncEngine } from '../lib/sync/SyncEngine'
import { useTaskStore } from '../store/taskStore'
import NetInfo from '@react-native-community/netinfo'

type BannerState = 'hidden' | 'offline' | 'syncing' | 'synced' | 'warning' | 'error'

export default function SyncBanner() {
  const [state, setState] = useState<BannerState>('hidden')
  const [pendingCount, setPendingCount] = useState(0)
  const [staleCount, setStaleCount] = useState(0)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)
  const error = useTaskStore(state => state.error)
  const clearError = useTaskStore(state => state.clearError)
  const opacity = useRef(new Animated.Value(0)).current
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = () => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start()
  }

  const hide = () => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      setState('hidden')
      setSyncError(null)
      clearError()
    })
  }

  const showThenHide = (delay = 3000) => {
    show()
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(hide, delay)
  }

  const handleRetry = async () => {
    if (retrying) return
    setRetrying(true)
    clearError()
    setSyncError(null)
    setState('syncing')
    show()

    await SyncEngine.sync()

    if (SyncEngine.lastError) {
      setSyncError(SyncEngine.lastError)
      setState('error')
      showThenHide(5000)
    } else {
      const remaining = await syncQueue.count()
      if (remaining === 0) {
        setState('synced')
        showThenHide(3000)
      } else {
        setState('offline')
      }
    }

    setRetrying(false)
  }

  useEffect(() => {
    // Écoute le réseau
    const unsubscribe = NetInfo.addEventListener(async netState => {
      const isOnline = !!(netState.isConnected && netState.isInternetReachable)

      if (!isOnline) {
        const count = await syncQueue.count()
        setPendingCount(count)
        const stale = await syncQueue.getOldPending()
        setStaleCount(stale)
        setState(stale > 0 ? 'warning' : 'offline')
        show()
      } else {
        const count = await syncQueue.count()
        const stale = await syncQueue.getOldPending()
        setStaleCount(stale)
        if (count > 0) {
          setState('syncing')
          show()

          await SyncEngine.sync()

          if (SyncEngine.lastError) {
            setSyncError(SyncEngine.lastError)
            setState('error')
            showThenHide(5000)
            return
          }

          const remaining = await syncQueue.count()
          const staleAfterSync = await syncQueue.getOldPending()
          setStaleCount(staleAfterSync)
          if (remaining === 0) {
            setState(staleAfterSync > 0 ? 'warning' : 'synced')
            showThenHide(staleAfterSync > 0 ? 7000 : 3000)
          } else {
            setState(staleAfterSync > 0 ? 'warning' : 'offline')
          }
        } else {
          hide()
        }
      }
    })

    return () => {
      unsubscribe()
      if (hideTimer.current) clearTimeout(hideTimer.current)
    }
  }, [])

  const currentError = error || syncError
  const bannerState = currentError ? 'error' : state
  if (bannerState === 'hidden') return null

  const config = {
    offline: {
      bg: 'rgba(220,38,38,0.95)',
      border: 'rgba(239,68,68,0.5)',
      text: pendingCount > 0
        ? `🔴 Hors ligne — ${pendingCount} modification${pendingCount > 1 ? 's' : ''} en attente`
        : '🔴 Hors ligne',
    },
    syncing: {
      bg: 'rgba(59,130,246,0.95)',
      border: 'rgba(96,165,250,0.5)',
      text: '🔄 Synchronisation en cours...',
    },
    synced: {
      bg: 'rgba(34,197,94,0.95)',
      border: 'rgba(74,222,128,0.5)',
      text: '✅ Tout est synchronisé',
    },
    warning: {
      bg: 'rgba(245,158,11,0.95)',
      border: 'rgba(251,191,36,0.5)',
      text: `⚠️ Avertissement : ${staleCount} action${staleCount > 1 ? 's' : ''} non sync depuis 7 jours`,
    },
    error: {
      bg: 'rgba(220,38,38,0.95)',
      border: 'rgba(239,68,68,0.5)',
      text: `❌ Erreur : ${currentError}`,
    },
    hidden: {
      bg: 'transparent',
      border: 'transparent',
      text: '',
    },
  }[bannerState]

const isError = bannerState === 'error'

  return (
    <Animated.View style={[styles.banner, {
      backgroundColor: config.bg,
      borderColor: config.border,
      opacity,
    }]}> 
      <Pressable
        style={styles.pressable}
        onPress={isError ? handleRetry : undefined}
        disabled={!isError || retrying}
      >
        <Text style={styles.text} numberOfLines={2}>
          {config.text}
          {isError ? ' Appuyez pour réessayer.' : ''}
          {retrying ? ' ⏳' : ''}
        </Text>
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  pressable: {
    width: '100%',
    paddingVertical: 8,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
})