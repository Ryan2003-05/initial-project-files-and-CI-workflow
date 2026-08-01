import { useEffect, useState } from 'react'
import { Stack, Redirect } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { View, ActivityIndicator } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import Constants from 'expo-constants'
import { authRepository } from '../lib/supabase'
import { Session } from '@supabase/supabase-js'
import { Colors } from '../constants/colors'
import { requestNotificationPermission, scheduleDailySummary } from '../lib/notifications'
import { initDatabase } from '../lib/database/sqlite'
import { keepSupabaseAlive } from '../lib/keepalive'
import { startNetworkDetector, isOnline } from '../lib/sync/NetworkDetector'
import { SyncEngine } from '../lib/sync/SyncEngine'
import { useTaskStore } from '../store/taskStore'

const isExpoGo = Constants.appOwnership === 'expo'

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    let unsubscribeAuth: (() => void) | undefined
    let stopDetector: (() => void) | undefined
    let removeNotificationListener: (() => void) | undefined

    const initialize = async () => {
      try {
        await initDatabase()
      } catch (e) {
        console.error('SQLite init error:', e)
      }

      const { tasks } = useTaskStore.getState()
      const activeTasks = tasks.filter(t => t.status !== 'terminee')
      await scheduleDailySummary(
        activeTasks.length,
        activeTasks.filter(t => t.priority === 'urgente').length,
        activeTasks.filter(t => t.status === 'en_retard').length,
      )

      keepSupabaseAlive()
      void requestNotificationPermission()

      unsubscribeAuth = authRepository.onAuthStateChange((_event, nextSession) => {
        if (isMounted) {
          setSession(nextSession)
        }
      })

      const currentSession = await authRepository.getSession()
      if (isMounted) {
        setSession(currentSession)
        setLoading(false)
      }
    }

    void initialize()

    if (!isExpoGo) {
      const Notifications = require('expo-notifications')
      const sub = Notifications.addNotificationResponseReceivedListener((response: any) => {
        const taskId = response.notification.request.content.data?.taskId
        if (taskId) {
          console.log('[Notif] Tâche cliquée:', taskId)
        }
      })
      removeNotificationListener = () => sub.remove()
    }

    stopDetector = startNetworkDetector()

    void isOnline().then(online => {
      if (online && isMounted) {
        SyncEngine.sync()
      }
    })

    return () => {
      isMounted = false
      unsubscribeAuth?.()
      stopDetector?.()
      removeNotificationListener?.()
    }
  }, [])

  if (loading) {
    return (
      <View style={{
        flex: 1,
        backgroundColor: Colors.bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <ActivityIndicator size="large" color={Colors.cyan} />
      </View>
    )
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="auth" />
        </Stack>
        {!session && <Redirect href="/auth/login" />}
        {session && <Redirect href="/(tabs)" />}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
