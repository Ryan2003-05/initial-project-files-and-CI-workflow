// ================================================
// SERVICE NOTIFICATIONS — RyanTask's
// Notifications intelligentes — CDC §3.6
// ⚠️ Nécessite un development build (pas Expo Go)
// ================================================

import { Platform } from 'react-native'
import { parseISO } from 'date-fns'
import Constants from 'expo-constants'

const isExpoGo = Constants.appOwnership === 'expo'

let Notifications: typeof import('expo-notifications') | null = null
if (!isExpoGo) {
  Notifications = require('expo-notifications')

  Notifications!.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  })
}

// ------------------------------------------------
// CANAUX ANDROID (priorité par type)
// ------------------------------------------------
export async function setupNotificationChannels(): Promise<void> {
  if (isExpoGo || !Notifications || Platform.OS !== 'android') return

  // Canal urgente — son fort + vibration longue
  await Notifications.setNotificationChannelAsync('urgente', {
    name: 'Tâches urgentes',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 500, 200, 500, 200, 500],
    lightColor: '#EF4444',
    sound: 'default',
  })

  // Canal moyenne — son normal + vibration courte
  await Notifications.setNotificationChannelAsync('moyenne', {
    name: 'Tâches moyennes',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#F59E0B',
    sound: 'default',
  })

  // Canal basse — silencieux, juste visuel
  await Notifications.setNotificationChannelAsync('basse', {
    name: 'Tâches basses',
    importance: Notifications.AndroidImportance.LOW,
    vibrationPattern: [0],
    lightColor: '#06B6D4',
    sound: undefined,
  })

  // Canal résumé quotidien
  await Notifications.setNotificationChannelAsync('resume', {
    name: 'Résumé quotidien',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 200],
    lightColor: '#06B6D4',
    sound: 'default',
  })

  // Canal retard
  await Notifications.setNotificationChannelAsync('retard', {
    name: 'Tâches en retard',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 400, 200, 400],
    lightColor: '#EF4444',
    sound: 'default',
  })
}

// ------------------------------------------------
// PERMISSION
// ------------------------------------------------
export async function requestNotificationPermission(): Promise<boolean> {
  if (isExpoGo || !Notifications) {
    console.log('📵 Notifications désactivées dans Expo Go')
    return false
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  // Configure les canaux Android
  await setupNotificationChannels()

  return finalStatus === 'granted'
}

// ------------------------------------------------
// HELPER — Planifier une notification unique
// ------------------------------------------------
async function schedule(
  date: Date,
  title: string,
  body: string,
  data: Record<string, unknown>,
  channelId: string = 'moyenne'
): Promise<string | null> {
  if (!Notifications) return null
  if (date.getTime() <= Date.now()) return null // Passé — on skip

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: channelId !== 'basse',
        ...(Platform.OS === 'android' && { channelId }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
      },
    })
    return id
  } catch (err) {
    console.error('schedule error:', err)
    return null
  }
}

// ------------------------------------------------
// PLANIFIER TOUS LES RAPPELS D'UNE TÂCHE
// Retourne un tableau d'IDs à stocker
// ------------------------------------------------
export async function scheduleTaskReminders(
  taskId: string,
  title: string,
  priority: 'urgente' | 'moyenne' | 'basse',
  deadlineDate: string,
  deadlineTime: string | null
): Promise<string[]> {
  if (isExpoGo || !Notifications) return []

  const ids: string[] = []
  const channelId = priority

  const timeStr = deadlineTime || '09:00'
  const [hours, minutes] = timeStr.split(':').map(Number)
  const deadline = parseISO(deadlineDate)
  deadline.setHours(hours, minutes, 0, 0)

  const data = { taskId, title }

  // 1. La veille à 20h
  const veilleAt20h = new Date(deadline)
  veilleAt20h.setDate(veilleAt20h.getDate() - 1)
  veilleAt20h.setHours(20, 0, 0, 0)

  const id1 = await schedule(
    veilleAt20h,
    `📋 Demain : ${title}`,
    `Échéance demain à ${timeStr} · Priorité ${priority}`,
    data, channelId
  )
  if (id1) ids.push(id1)

  // 2. Le matin du jour J à 8h
  const matinJ = new Date(deadline)
  matinJ.setHours(8, 0, 0, 0)

  const id2 = await schedule(
    matinJ,
    `⏰ Aujourd'hui : ${title}`,
    `Échéance aujourd'hui à ${timeStr} · Priorité ${priority}`,
    data, channelId
  )
  if (id2) ids.push(id2)

  // 3. 30 minutes avant
  const trentMinAvant = new Date(deadline.getTime() - 30 * 60 * 1000)

  const id3 = await schedule(
    trentMinAvant,
    `🚨 Dans 30 min : ${title}`,
    `Prépare-toi — échéance à ${timeStr}`,
    data, channelId
  )
  if (id3) ids.push(id3)

  // 4. À l'heure exacte
  const id4 = await schedule(
    deadline,
    `⏱️ Échéance maintenant : ${title}`,
    `La tâche "${title}" arrive à son terme`,
    data, channelId
  )
  if (id4) ids.push(id4)

  // 5. Relance 1h après si urgente ou moyenne
  if (priority !== 'basse') {
    const unheAp = new Date(deadline.getTime() + 60 * 60 * 1000)
    const id5 = await schedule(
      unheAp,
      `😔 Toujours en attente : ${title}`,
      `Cette tâche est maintenant en retard — traite-la maintenant`,
      data, 'retard'
    )
    if (id5) ids.push(id5)
  }

  // 6. Le lendemain matin si urgente
  if (priority === 'urgente') {
    const lendeMatin = new Date(deadline)
    lendeMatin.setDate(lendeMatin.getDate() + 1)
    lendeMatin.setHours(8, 0, 0, 0)

    const id6 = await schedule(
      lendeMatin,
      `🔴 En retard : ${title}`,
      `Cette tâche urgente n'a pas été terminée — à traiter maintenant`,
      data, 'retard'
    )
    if (id6) ids.push(id6)
  }

  return ids
}

// Garde la compatibilité avec l'ancien nom
export async function scheduleTaskReminder(
  taskId: string,
  title: string,
  deadlineDate: string,
  deadlineTime: string | null,
  priority: 'urgente' | 'moyenne' | 'basse' = 'moyenne'
): Promise<string | null> {
  const ids = await scheduleTaskReminders(
    taskId, title, priority, deadlineDate, deadlineTime
  )
  // Retourne le premier ID pour compatibilité
  return ids.length > 0 ? ids[0] : null
}

// ------------------------------------------------
// ANNULER LES RAPPELS D'UNE TÂCHE
// ------------------------------------------------
export async function cancelTaskReminders(
  notificationIds: string[]
): Promise<void> {
  if (isExpoGo || !Notifications) return
  for (const id of notificationIds) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id)
    } catch (e) {
      // Silencieux
    }
  }
}

// Compatibilité ancien nom
export async function cancelTaskReminder(
  notificationId: string | null
): Promise<void> {
  if (!notificationId) return
  await cancelTaskReminders([notificationId])
}

export async function cancelAllReminders(): Promise<void> {
  if (isExpoGo || !Notifications) return
  await Notifications.cancelAllScheduledNotificationsAsync()
}

// ------------------------------------------------
// RÉSUMÉ QUOTIDIEN — à appeler au démarrage
// Planifie une notif récap chaque matin à 7h
// ------------------------------------------------
export async function scheduleDailySummary(
  totalTasks: number,
  urgentCount: number,
  lateCount: number
): Promise<void> {
  if (isExpoGo || !Notifications) return
  if (totalTasks === 0) return

  try {
    // Annule l'ancien résumé
    const scheduled = await Notifications.getAllScheduledNotificationsAsync()
    for (const notif of scheduled) {
      if ((notif.content.data as any)?.type === 'daily_summary') {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier)
      }
    }

    // Demain à 7h
    const tomorrow7h = new Date()
    tomorrow7h.setDate(tomorrow7h.getDate() + 1)
    tomorrow7h.setHours(7, 0, 0, 0)

    const parts: string[] = []
    if (totalTasks > 0) parts.push(`${totalTasks} tâche${totalTasks > 1 ? 's' : ''}`)
    if (urgentCount > 0) parts.push(`${urgentCount} urgente${urgentCount > 1 ? 's' : ''}`)
    if (lateCount > 0) parts.push(`${lateCount} en retard`)

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `📊 Aujourd'hui — ${parts.join(' · ')}`,
        body: lateCount > 0
          ? `Tu as ${lateCount} tâche${lateCount > 1 ? 's' : ''} en retard à traiter en priorité`
          : `Bonne journée ! Tu as ${totalTasks} tâche${totalTasks > 1 ? 's' : ''} à gérer`,
        data: { type: 'daily_summary' },
        sound: true,
        ...(Platform.OS === 'android' && { channelId: 'resume' }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: tomorrow7h,
      },
    })
  } catch (err) {
    console.error('scheduleDailySummary error:', err)
  }
}

// ------------------------------------------------
// NOTIFICATION IMMÉDIATE (test ou alerte urgente)
// ------------------------------------------------
export async function sendImmediateNotification(
  title: string,
  body: string,
  channelId: string = 'moyenne'
): Promise<void> {
  if (isExpoGo || !Notifications) return
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        ...(Platform.OS === 'android' && { channelId }),
      },
      trigger: null, // Immédiat
    })
  } catch (err) {
    console.error('sendImmediateNotification error:', err)
  }
}