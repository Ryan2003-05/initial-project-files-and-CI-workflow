// ÉCRAN TÂCHES — RyanTask's
// Liste principale + filtres + FAB

import { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, TextInput,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Swipeable } from 'react-native-gesture-handler'
import { useTaskStore } from '../../store/taskStore'
import { authRepository } from '../../lib/supabase'
import { SyncEngine } from '../../lib/sync/SyncEngine'
import { isOnline } from '../../lib/sync/NetworkDetector'
import { Colors, PriorityColors } from '../../constants/colors'
import { Task, Priority } from '../../types'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import TaskFormModal from '../../components/TaskFormModal'
import TaskDetailModal from '../../components/TaskDetailModal'
import AvatarPicker from '../../components/AvatarPicker'
import { scheduleTaskReminder } from '../../lib/notifications'
import SyncBadge from '../../components/SyncBadge'

// TYPES FILTRES

type FilterType = 'toutes' | 'urgente' | 'moyenne' | 'basse' | 'retard'

export default function TachesScreen() {
  const { tasks, fetchTasks, completeTask, deleteTask, updateTask, addTask } = useTaskStore()
  const [userId, setUserId] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterType>('toutes')
  const [search, setSearch] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [detailModalVisible, setDetailModalVisible] = useState(false)

  useEffect(() => {
    // Récupère l'utilisateur depuis la session Supabase
    authRepository.getUser().then(user => {
      if (user) {
        setUserId(user.id)
        useTaskStore.getState().setUserId(user.id)
        // Charge depuis SQLite — instantané
        fetchTasks(user.id)
      }
    })

    const interval = setInterval(() => {
      useTaskStore.getState().checkOverdueTasks()
    }, 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  const onRefresh = async () => {
    setRefreshing(true)
    // Sync avec Supabase si en ligne
    const online = await isOnline()
    if (online) await SyncEngine.sync()
    // Recharge depuis SQLite
    if (userId) await fetchTasks(userId)
    setRefreshing(false)
  }

  const filteredTasks = tasks.filter(t => {
    if (t.status === 'terminee') return false
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase())
    if (!matchSearch) return false
    if (filter === 'toutes') return true
    if (filter === 'retard') return t.status === 'en_retard'
    return t.priority === filter
  })

  const lateTasks = filteredTasks.filter(t => t.status === 'en_retard')
  const activeTasks = filteredTasks.filter(t => t.status === 'active')

  const handleCreateTask = async (data: {
    title: string
    description: string
    priority: Priority
    deadline_date: string
    deadline_time: string | null
    reminder_enabled: boolean
    checklist: string[]
  }) => {
    if (!userId) return

    await addTask({
      user_id: userId,
      title: data.title,
      description: data.description || null,
      priority: data.priority,
      status: 'active',
      deadline_date: data.deadline_date,
      deadline_time: data.deadline_time,
      reminder_enabled: data.reminder_enabled,
      notification_id: null,
    })

    setModalVisible(false)
    await fetchTasks(userId)

    if (data.reminder_enabled) {
      const newTask = useTaskStore.getState().tasks.find(
        t => t.title === data.title && t.deadline_date === data.deadline_date
      )
      if (newTask) {
        const notifId = await scheduleTaskReminder(
          newTask.id,
          newTask.title,
          newTask.deadline_date,
          newTask.deadline_time
        )
        if (notifId) {
          await updateTask(newTask.id, { notification_id: notifId })
        }
      }
    }
  }

  const handleCardPress = (task: Task) => {
    setSelectedTask(task)
    setDetailModalVisible(true)
  }

  const handleRefreshAfterDetail = async () => {
    if (userId) await fetchTasks(userId)
  }

  return (
    <SafeAreaView style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Mes tâches</Text>
          <Text style={styles.headerSub}>
            {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
          </Text>
        </View>
        {userId && (
          <AvatarPicker
            userId={userId}
            size={36}
            initials="RN"
          />
        )}
      </View>

      {/* SEARCH */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une tâche…"
          placeholderTextColor={Colors.muted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* FILTRES */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersWrap}
        contentContainerStyle={styles.filtersContent}
      >
        {([
          { key: 'toutes', label: 'Toutes' },
          { key: 'urgente', label: 'Urgentes' },
          { key: 'moyenne', label: 'Moyennes' },
          { key: 'basse', label: 'Basses' },
          { key: 'retard', label: '😔 En retard' },
        ] as { key: FilterType; label: string }[]).map(f => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterTab,
              filter === f.key && styles.filterTabActive,
              f.key === 'retard' && styles.filterTabLate,
              f.key === 'retard' && filter === f.key && styles.filterTabLateActive,
            ]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[
              styles.filterText,
              filter === f.key && styles.filterTextActive,
              f.key === 'retard' && styles.filterTextLate,
              f.key === 'retard' && filter === f.key && styles.filterTextLateActive,
            ]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* LISTE */}
      <ScrollView
        style={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.cyan}
          />
        }
      >
        {lateTasks.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>🔴 En retard · {lateTasks.length}</Text>
            {lateTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onComplete={completeTask}
                onDelete={deleteTask}
                onPress={handleCardPress}
              />
            ))}
          </>
        )}

        {activeTasks.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>📋 Actives · {activeTasks.length}</Text>
            {activeTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onComplete={completeTask}
                onDelete={deleteTask}
                onPress={handleCardPress}
              />
            ))}
          </>
        )}

        {filteredTasks.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.emptyText}>Aucune tâche pour le moment</Text>
            <Text style={styles.emptySubText}>Appuie sur + pour en créer une</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      <TaskFormModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={handleCreateTask}
      />

      <TaskDetailModal
        visible={detailModalVisible}
        task={selectedTask}
        onClose={() => {
          setDetailModalVisible(false)
          if (userId) fetchTasks(userId)
        }}
        onUpdate={updateTask}
        onDelete={deleteTask}
        onComplete={completeTask}
        onRefresh={handleRefreshAfterDetail}
      />

    </SafeAreaView>
  )
}


// COMPOSANT TASK CARD

function TaskCard({
  task,
  onComplete,
  onDelete,
  onPress,
}: {
  task: Task
  onComplete: (id: string) => void
  onDelete: (id: string) => void
  onPress: (task: Task) => void
}) {
  const priorityColor = PriorityColors[task.priority]
  const checklist = task.checklist || []
  const doneItems = checklist.filter(c => c.is_done).length
  const progress = checklist.length > 0
    ? Math.round((doneItems / checklist.length) * 100)
    : 0

  const renderCompleteSwipeAction = () => (
    <View style={styles.swipeCompleteAction}>
      <Text style={styles.swipeCompleteIcon}>✓</Text>
      <Text style={styles.swipeCompleteText}>Terminer</Text>
    </View>
  )

  return (
    <Swipeable
      renderLeftActions={renderCompleteSwipeAction}
      leftThreshold={96}
      overshootLeft={false}
      overshootRight={false}
      onSwipeableOpen={(direction, swipeable) => {
        if (direction === 'left') {
          swipeable.close()
          onComplete(task.id)
        }
      }}
    >
      <TouchableOpacity
        style={[styles.card, { borderLeftColor: priorityColor.bar }]}
        onPress={() => onPress(task)}
        activeOpacity={0.7}
      >
        {/* Top */}
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle} numberOfLines={1}>{task.title}</Text>
          <View style={styles.cardTopRight}>
            <SyncBadge status={task._sync_status} />
            <View style={[styles.badge, {
              backgroundColor: priorityColor.bg,
              borderColor: priorityColor.border,
            }]}>
              <Text style={[styles.badgeText, { color: priorityColor.text }]}>
                {task.priority.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Description */}
        {task.description ? (
          <Text style={styles.cardDesc} numberOfLines={2}>{task.description}</Text>
        ) : null}

        {/* Footer */}
        <View style={styles.cardFooter}>
          <Text style={[
            styles.cardDate,
            task.status === 'en_retard' && styles.cardDateLate,
          ]}>
            📅 Échéance : {format(parseISO(task.deadline_date), 'd MMM yyyy', { locale: fr })}
            {task.status === 'en_retard' ? ' · EN RETARD' : ''}
          </Text>

          {checklist.length > 0 && (
            <View style={styles.progressWrap}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
              <Text style={styles.progressText}>
                {doneItems}/{checklist.length} · {progress}%
              </Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionSuccess]}
            onPress={(e) => { e.stopPropagation(); onComplete(task.id) }}
          >
            <Text style={styles.actionText}>🏁 Terminé</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionDelete]}
            onPress={(e) => { e.stopPropagation(); onDelete(task.id) }}
          >
            <Text style={styles.actionText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Swipeable>
  )
}


// STYLES

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.text, letterSpacing: -0.5 },
  headerSub: { fontSize: 12, color: Colors.muted, marginTop: 2 },

  searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 10, backgroundColor: Colors.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: Colors.border, gap: 8 },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, color: Colors.text, fontSize: 13 },

  filtersWrap: { maxHeight: 44 },
  filtersContent: { paddingHorizontal: 20, gap: 6, paddingBottom: 10 },
  filterTab: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: Colors.border },
  filterTabActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  filterTabLate: { borderColor: 'rgba(220,38,38,0.4)' },
  filterTabLateActive: { backgroundColor: Colors.urgent, borderColor: Colors.urgent },
  filterText: { fontSize: 11, fontWeight: '600', color: Colors.muted },
  filterTextActive: { color: '#fff' },
  filterTextLate: { color: Colors.urgent },
  filterTextLateActive: { color: '#fff' },

  list: { flex: 1, paddingHorizontal: 12 },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: Colors.muted, letterSpacing: 1, paddingVertical: 6, paddingHorizontal: 4, textTransform: 'uppercase' },
  swipeCompleteAction: { width: 116, minHeight: 88, marginBottom: 8, borderRadius: 14, backgroundColor: 'rgba(34,197,94,0.18)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.35)', alignItems: 'center', justifyContent: 'center' },
  swipeCompleteIcon: { fontSize: 20, color: '#86EFAC', fontWeight: '800', lineHeight: 22 },
  swipeCompleteText: { fontSize: 11, color: '#86EFAC', fontWeight: '800', marginTop: 4 },

  card: { backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 3 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  cardTitle: { fontSize: 13, fontWeight: '600', color: Colors.text, flex: 1 },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10, borderWidth: 1, marginLeft: 8 },
  badgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  cardDesc: { fontSize: 11, color: Colors.muted, marginBottom: 8, lineHeight: 16 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardDate: { fontSize: 10, color: Colors.muted },
  cardDateLate: { color: '#FCA5A5' },
  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  progressBar: { width: 60, height: 3, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.cyan, borderRadius: 2 },
  progressText: { fontSize: 10, color: Colors.text2 },

  cardTopRight: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 8,  },
  
  cardActions: { flexDirection: 'row', gap: 6 },
  actionBtn: { flex: 1, paddingVertical: 6, borderRadius: 8, alignItems: 'center' },
  actionSuccess: { backgroundColor: 'rgba(6,182,212,0.15)' },
  actionDelete: { flex: 0, paddingHorizontal: 12, backgroundColor: 'rgba(255,255,255,0.06)' },
  actionText: { fontSize: 11, fontWeight: '600', color: Colors.text },

  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, fontWeight: '600', color: Colors.text2, marginBottom: 8 },
  emptySubText: { fontSize: 13, color: Colors.muted },

  fab: { position: 'absolute', bottom: 80, right: 20, width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.cyan, alignItems: 'center', justifyContent: 'center', shadowColor: Colors.cyan, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
  fabIcon: { fontSize: 28, color: '#fff', fontWeight: '300', lineHeight: 32 },
})
