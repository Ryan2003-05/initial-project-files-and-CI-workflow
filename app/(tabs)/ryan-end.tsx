// ÉCRAN RYAN-END — RyanTask's
// Archive des tâches terminées + filtres temporels

import { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTaskStore } from '../../store/taskStore'
import { authRepository } from '../../lib/supabase'
import { SyncEngine } from '../../lib/sync/SyncEngine'
import { isOnline } from '../../lib/sync/NetworkDetector'
import { Colors } from '../../constants/colors'
import { Task } from '../../types'
import { format, parseISO, isThisWeek, isThisMonth, isThisYear, isToday } from 'date-fns'
import { fr } from 'date-fns/locale'
import SyncBadge from '../../components/SyncBadge'

type PeriodFilter = 'tout' | 'aujourd_hui' | 'semaine' | 'mois' | 'annee'
type ResultFilter = 'tout' | 'reussi' | 'echec'

export default function RyanEndScreen() {
  const { tasks, fetchTasks, deleteTask } = useTaskStore()
  const [userId, setUserId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('tout')
  const [resultFilter, setResultFilter] = useState<ResultFilter>('tout')

  useEffect(() => {
    authRepository.getUser().then(user => {
      if (user) {
        setUserId(user.id)
        fetchTasks(user.id)
      }
    })
  }, [])

  const onRefresh = async () => {
    setRefreshing(true)
    const online = await isOnline()
    if (online) await SyncEngine.sync()
    if (userId) await fetchTasks(userId)
    setRefreshing(false)
  }

  // Toutes les tâches archivées
  const allArchived = tasks.filter(t => t.status === 'terminee')

  // Filtre temporel basé sur completed_at
  const filterByPeriod = (task: Task): boolean => {
    const dateStr = task.completed_at || task.deadline_date
    const date = parseISO(dateStr)
    if (periodFilter === 'aujourd_hui') return isToday(date)
    if (periodFilter === 'semaine') return isThisWeek(date, { weekStartsOn: 1 })
    if (periodFilter === 'mois') return isThisMonth(date)
    if (periodFilter === 'annee') return isThisYear(date)
    return true
  }

  // Filtre résultat
  const filterByResult = (task: Task): boolean => {
    if (resultFilter === 'reussi') return task.result === 'reussi'
    if (resultFilter === 'echec') return task.result === 'echec'
    return true
  }

  const filteredTasks = allArchived.filter(t => filterByPeriod(t) && filterByResult(t))

  // Compteurs sur la sélection filtrée
  const reussi = filteredTasks.filter(t => t.result === 'reussi').length
  const echec = filteredTasks.filter(t => t.result === 'echec').length
  const taux = filteredTasks.length > 0 ? Math.round((reussi / filteredTasks.length) * 100) : 0

  const PERIOD_FILTERS: { key: PeriodFilter; label: string }[] = [
    { key: 'tout', label: 'Tout' },
    { key: 'aujourd_hui', label: "Aujourd'hui" },
    { key: 'semaine', label: 'Semaine' },
    { key: 'mois', label: 'Mois' },
    { key: 'annee', label: 'Année' },
  ]
  const RESULT_FILTERS: { key: ResultFilter; label: string }[] = [
    { key: 'tout', label: 'Tous' },
    { key: 'reussi', label: '✅ Réussis' },
    { key: 'echec', label: '❌ Échecs' },
  ]

  return (
    <SafeAreaView style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Ryan-End</Text>
          <Text style={styles.headerSub}>
            {filteredTasks.length} tâche{filteredTasks.length !== 1 ? 's' : ''} · {allArchived.length} au total
          </Text>
        </View>
        <Text style={styles.headerIcon}>🏁</Text>
      </View>

      {/* FILTRES PÉRIODE */}
      <View style={styles.filtersBlock}>
        <Text style={styles.filtersBlockLabel}>PÉRIODE</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
        >
          {PERIOD_FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterTab,
                periodFilter === f.key && styles.filterTabActive,
              ]}
              onPress={() => setPeriodFilter(f.key)}
            >
              <Text style={[
                styles.filterText,
                periodFilter === f.key && styles.filterTextActive,
              ]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* FILTRES RÉSULTAT */}
      <View style={styles.filtersBlock}>
        <Text style={styles.filtersBlockLabel}>RÉSULTAT</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
        >
          {RESULT_FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterTab,
                resultFilter === f.key && styles.filterTabActive,
                f.key === 'reussi' && resultFilter === f.key && styles.filterTabSuccess,
                f.key === 'echec' && resultFilter === f.key && styles.filterTabFail,
              ]}
              onPress={() => setResultFilter(f.key)}
            >
              <Text style={[
                styles.filterText,
                resultFilter === f.key && styles.filterTextActive,
              ]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* COMPTEURS */}
      {filteredTasks.length > 0 && (
        <View style={styles.counters}>
          <View style={[styles.counterBox, styles.counterSuccess]}>
            <Text style={styles.counterVal}>{reussi}</Text>
            <Text style={styles.counterLbl}>Réussis ✅</Text>
          </View>
          <View style={[styles.counterBox, styles.counterFail]}>
            <Text style={styles.counterVal}>{echec}</Text>
            <Text style={styles.counterLbl}>Échecs ❌</Text>
          </View>
          <View style={[styles.counterBox, styles.counterRate]}>
            <Text style={[
              styles.counterVal,
              { color: taux >= 70 ? '#22C55E' : taux >= 40 ? '#FACC15' : '#DC2626' }
            ]}>
              {taux}%
            </Text>
            <Text style={styles.counterLbl}>Réussite</Text>
          </View>
        </View>
      )}

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
        {filteredTasks.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🏁</Text>
            <Text style={styles.emptyText}>
              {allArchived.length === 0
                ? 'Aucune tâche terminée'
                : 'Aucune tâche pour ce filtre'}
            </Text>
            <Text style={styles.emptySubText}>
              {allArchived.length === 0
                ? 'Termine tes tâches pour les voir apparaître ici'
                : 'Change la période ou le filtre résultat'}
            </Text>
          </View>
        ) : (
          filteredTasks.map(task => (
            <ArchivedCard
              key={task.id}
              task={task}
              onDelete={deleteTask}
            />
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

    </SafeAreaView>
  )
}

// COMPOSANT ARCHIVED CARD

function ArchivedCard({
  task,
  onDelete,
}: {
  task: Task
  onDelete: (id: string) => void
}) {
  const isReussi = task.result === 'reussi'

  const handleDelete = () => {
    Alert.alert(
      '🗑️ Supprimer définitivement ?',
      `"${task.title}" sera supprimée définitivement et ne pourra pas être récupérée.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => onDelete(task.id),
        },
      ]
    )
  }

  return (
    <View style={[
      styles.card,
      isReussi ? styles.cardSuccess : styles.cardFail,
    ]}>
      <View style={styles.cardMain}>
        <View style={styles.cardLeft}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {task.title}
            </Text>
            <SyncBadge status={task._sync_status} />
          </View>
          <View style={styles.datesWrap}>
            <View style={styles.dateRow}>
              <Text style={styles.dateLabel}>📅 Créé le :</Text>
              <Text style={styles.dateValue}>
                {format(parseISO(task.created_at), 'd MMM yyyy', { locale: fr })}
              </Text>
            </View>
            <View style={styles.dateRow}>
              <Text style={styles.dateLabel}>⏰ Échéance :</Text>
              <Text style={styles.dateValue}>
                {format(parseISO(task.deadline_date), 'd MMM yyyy', { locale: fr })}
                {task.deadline_time ? `, ${task.deadline_time}` : ''}
              </Text>
            </View>
            {task.completed_at && (
              <View style={styles.dateRow}>
                <Text style={styles.dateLabel}>🏁 Terminé le :</Text>
                <Text style={styles.dateValue}>
                  {format(parseISO(task.completed_at), 'd MMM yyyy à HH:mm', { locale: fr })}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={[
          styles.resultBadge,
          isReussi ? styles.resultBadgeSuccess : styles.resultBadgeFail,
        ]}>
          <Text style={[
            styles.resultBadgeText,
            isReussi ? styles.resultTextSuccess : styles.resultTextFail,
          ]}>
            {isReussi ? 'RÉUSSI ✅' : 'ÉCHEC ❌'}
          </Text>
        </View>
      </View>

      {/* Bouton suppression définitive */}
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={handleDelete}
      >
        <Text style={styles.deleteBtnText}>🗑️ Supprimer définitivement</Text>
      </TouchableOpacity>
    </View>
  )
}


// STYLES

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.text, letterSpacing: -0.5 },
  headerSub: { fontSize: 12, color: Colors.muted, marginTop: 2 },
  headerIcon: { fontSize: 26 },

  // Filtres
  filtersBlock: { paddingHorizontal: 16, marginBottom: 6 },
  filtersBlockLabel: { fontSize: 9, fontWeight: '700', color: Colors.muted, letterSpacing: 1, marginBottom: 4 },
  filtersRow: { flexDirection: 'row', gap: 6, paddingBottom: 4 },
  filterTab: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: Colors.border },
  filterTabActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  filterTabSuccess: { backgroundColor: 'rgba(34,197,94,0.2)', borderColor: 'rgba(34,197,94,0.4)' },
  filterTabFail: { backgroundColor: 'rgba(220,38,38,0.2)', borderColor: 'rgba(220,38,38,0.4)' },
  filterText: { fontSize: 11, fontWeight: '600', color: Colors.muted },
  filterTextActive: { color: '#fff' },

  // Compteurs
  counters: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, marginBottom: 10, marginTop: 4 },
  counterBox: { flex: 1, borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 1 },
  counterSuccess: { backgroundColor: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.2)' },
  counterFail: { backgroundColor: 'rgba(220,38,38,0.1)', borderColor: 'rgba(220,38,38,0.2)' },
  counterRate: { backgroundColor: 'rgba(6,182,212,0.1)', borderColor: 'rgba(6,182,212,0.2)' },
  counterVal: { fontSize: 20, fontWeight: '800', color: Colors.text },
  counterLbl: { fontSize: 10, color: Colors.muted, marginTop: 2 },

  // Liste
  list: { flex: 1, paddingHorizontal: 12 },

  // Card
  card: { backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 3, opacity: 0.9 },
  cardSuccess: { borderLeftColor: '#22C55E' },
  cardFail: { borderLeftColor: '#DC2626' },
  cardMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardLeft: { flex: 1, marginRight: 10 },
  cardTitle: { fontSize: 13, fontWeight: '600', color: Colors.text2},
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },

  // Dates
  datesWrap: { gap: 3 },
  dateRow: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  dateLabel: { fontSize: 10, color: Colors.muted },
  dateValue: { fontSize: 10, color: Colors.text2 },

  // Badge résultat
  resultBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  resultBadgeSuccess: { backgroundColor: 'rgba(34,197,94,0.15)' },
  resultBadgeFail: { backgroundColor: 'rgba(220,38,38,0.15)' },
  resultBadgeText: { fontSize: 10, fontWeight: '700' },
  resultTextSuccess: { color: '#86EFAC' },
  resultTextFail: { color: '#FCA5A5' },

  // Delete
  deleteBtn: { alignSelf: 'flex-end', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)' },
  deleteBtnText: { fontSize: 11, color: Colors.muted },

  // Vide
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, fontWeight: '600', color: Colors.text2, marginBottom: 8 },
  emptySubText: { fontSize: 13, color: Colors.muted, textAlign: 'center', paddingHorizontal: 40 },
})