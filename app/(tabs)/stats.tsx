// ÉCRAN STATS — RyanTask's
// KPI + Graphique + Résumé mensuel + Bilan annuel

import { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTaskStore } from '../../store/taskStore'
import { authRepository } from '../../lib/supabase'
import { Colors } from '../../constants/colors'
import { MonthStats } from '../../types'

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const MONTHS_SHORT = ['Jan','Fév','Mar','Avr','Mai','Jun','Juil','Aoû','Sep','Oct','Nov','Déc']

function barColor(rate: number, isEmpty: boolean): string {
  if (isEmpty) return 'rgba(255,255,255,0.1)'
  if (rate >= 80) return Colors.low
  if (rate >= 50) return Colors.medium
  return Colors.urgent
}

function getMonthMessage(rate: number): { text: string; color: string; bg: string; border: string } {
  if (rate >= 90) return {
    text: "🌟 Exceptionnel ! Tu es une machine à discipline. Continue sur cette lancée, rien ne peut t'arrêter.",
    color: Colors.low, bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)',
  }
  if (rate >= 75) return {
    text: "💪 Très bon mois ! Tu montres une vraie rigueur. Quelques ajustements et tu touches la perfection.",
    color: Colors.cyan, bg: 'rgba(6,182,212,0.08)', border: 'rgba(6,182,212,0.2)',
  }
  if (rate >= 50) return {
    text: "⚡ Mois correct, mais tu peux faire mieux. Identifie ce qui t'a freiné et attaque le prochain mois avec plus d'élan.",
    color: Colors.medium, bg: 'rgba(250,204,21,0.08)', border: 'rgba(250,204,21,0.2)',
  }
  if (rate > 0) return {
    text: "🔥 Ce mois a été difficile. La discipline se construit dans les moments durs. Relève-toi, réorganise-toi — tu en es capable.",
    color: Colors.urgent, bg: 'rgba(220,38,38,0.08)', border: 'rgba(220,38,38,0.2)',
  }
  return {
    text: "📅 Mois pas encore commencé. Prépare tes tâches à l'avance pour partir fort !",
    color: Colors.muted, bg: 'rgba(255,255,255,0.04)', border: Colors.border,
  }
}

function getAnnualMessage(rate: number): { text: string; color: string; bg: string; border: string } {
  if (rate >= 85) return {
    text: "🏆 Année remarquable ! Tu as prouvé que la discipline n'est pas une option pour toi — c'est un mode de vie. Peu de personnes atteignent ce niveau de rigueur. Fixe-toi des objectifs encore plus ambitieux l'année prochaine, t'es incroyable",
    color: Colors.low, bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.25)',
  }
  if (rate >= 70) return {
    text: "💪 Belle année ! Tu as montré une vraie capacité à t'organiser. Analyse les mois en rouge pour comprendre tes points faibles et l'année prochaine sera encore meilleure.",
    color: Colors.cyan, bg: 'rgba(6,182,212,0.08)', border: 'rgba(6,182,212,0.25)',
  }
  if (rate >= 50) return {
    text: "⚡ Année en demi-teinte. Tu as du potentiel mais la régularité te fait encore défaut. La discipline se cultive chaque jour — commence petit, reste constant. L'année prochaine, vise 75%.",
    color: Colors.medium, bg: 'rgba(250,204,21,0.08)', border: 'rgba(250,204,21,0.25)',
  }
  return {
    text: "🔥 L'année a été difficile, mais le fait d'être ici et de mesurer tes résultats prouve que tu veux progresser. Redouble de discipline, décompose tes tâches en petites étapes et attaque l'année prochaine avec une ardeur nouvelle.",
    color: Colors.urgent, bg: 'rgba(220,38,38,0.08)', border: 'rgba(220,38,38,0.25)',
  }
}

export default function StatsScreen() {
  const { fetchTasks, getStats } = useTaskStore()
  const [userId, setUserId] = useState<string | null>(null)
  const [showMonthly, setShowMonthly] = useState(false)
  const [showAnnual, setShowAnnual] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(0)

  useEffect(() => {
    authRepository.getUser().then(user => {
      if (user) {
        setUserId(user.id)
        fetchTasks(user.id)
      }
    })
  }, [])

  const stats = getStats()
  const { monthlyData } = stats
  const maxDone = Math.max(...monthlyData.map(m => m.done), 1)
  const currentMonth = new Date().getMonth()

  const selectedMonthData = monthlyData[selectedMonth]
  const monthMsg = getMonthMessage(selectedMonthData?.rate ?? 0)
  const annualMsg = getAnnualMessage(stats.globalRate)

  const rSuccMonth = selectedMonthData?.done > 0
    ? Math.round(((selectedMonthData.done - selectedMonthData.fail) / selectedMonthData.done) * 100)
    : 0
  const rFailMonth = selectedMonthData?.done > 0
    ? Math.round((selectedMonthData.fail / selectedMonthData.done) * 100)
    : 0

  const rSuccAnnual = stats.totalDone > 0
    ? Math.round(((stats.totalDone - stats.totalFail) / stats.totalDone) * 100)
    : 0
  const rFailAnnual = stats.totalDone > 0
    ? Math.round((stats.totalFail / stats.totalDone) * 100)
    : 0

  return (
    <SafeAreaView style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Statistiques</Text>
          <Text style={styles.headerSub}>Bilan de productivité {new Date().getFullYear()}</Text>
        </View>
        <Text style={styles.headerIcon}>📈</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* KPI GRID */}
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiBox, { backgroundColor: 'rgba(6,182,212,0.1)', borderColor: 'rgba(6,182,212,0.2)' }]}>
            <Text style={[styles.kpiVal, { color: Colors.cyan }]}>{stats.totalCreated}</Text>
            <Text style={styles.kpiLbl}>Tâches créées</Text>
          </View>
          <View style={[styles.kpiBox, { backgroundColor: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.2)' }]}>
            <Text style={[styles.kpiVal, { color: Colors.low }]}>{stats.totalDone}</Text>
            <Text style={styles.kpiLbl}>Terminées</Text>
          </View>
          <View style={[styles.kpiBox, { backgroundColor: 'rgba(250,204,21,0.1)', borderColor: 'rgba(250,204,21,0.2)' }]}>
            <Text style={[styles.kpiVal, { color: Colors.medium }]}>{stats.totalCreated - stats.totalDone}</Text>
            <Text style={styles.kpiLbl}>En attente</Text>
          </View>
          <View style={[styles.kpiBox, { backgroundColor: 'rgba(220,38,38,0.1)', borderColor: 'rgba(220,38,38,0.2)' }]}>
            <Text style={[styles.kpiVal, { color: Colors.urgent }]}>{stats.totalLate}</Text>
            <Text style={styles.kpiLbl}>En retard</Text>
          </View>
        </View>

        {/* STREAK */}
        <View style={styles.streakBox}>
          <Text style={styles.streakText}>🔥 Streak actuel</Text>
          <Text style={styles.streakVal}>{stats.streak} jour{stats.streak > 1 ? 's' : ''} consécutif{stats.streak > 1 ? 's' : ''}</Text>
        </View>

        {/* GRAPHIQUE ANNUEL */}
        <View style={styles.chartWrap}>
          <Text style={styles.chartTitle}>TÂCHES PAR MOIS — {new Date().getFullYear()} · Appuie sur un mois</Text>
          <View style={styles.bars}>
            {monthlyData.map((m, i) => {
              const isEmpty = m.created === 0
              const h = isEmpty ? 6 : Math.max(6, Math.round((m.done / maxDone) * 58))
              const isSelected = showMonthly && selectedMonth === i
              return (
                <TouchableOpacity
                  key={i}
                  style={styles.barCol}
                  onPress={() => {
                    setSelectedMonth(i)
                    setShowMonthly(true)
                  }}
                >
                  <View style={[
                    styles.barFill,
                    {
                      height: h,
                      backgroundColor: barColor(m.rate, isEmpty),
                      opacity: isSelected ? 1 : 0.75,
                      borderWidth: isSelected ? 2 : 0,
                      borderColor: Colors.cyan,
                    },
                  ]} />
                  <Text style={[
                    styles.barLbl,
                    i === currentMonth && { color: Colors.cyan, fontWeight: '700' },
                    isSelected && { color: Colors.cyan },
                  ]}>
                    {MONTHS_SHORT[i]}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
          {/* Légende */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.low }]} />
              <Text style={styles.legendText}>&gt;80%</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.medium }]} />
              <Text style={styles.legendText}>50–80%</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.urgent }]} />
              <Text style={styles.legendText}>&lt;50%</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: 'rgba(255,255,255,0.15)' }]} />
              <Text style={styles.legendText}>Futur</Text>
            </View>
          </View>
        </View>

        {/* BOUTON RÉSUMÉ MENSUEL */}
        <TouchableOpacity
          style={styles.resumeBtn}
          onPress={() => setShowMonthly(!showMonthly)}
        >
          <Text style={styles.resumeBtnText}>
            📊 Résumé mensuel détaillé {showMonthly ? '▴' : '▾'}
          </Text>
        </TouchableOpacity>

        {/* PANEL MENSUEL */}
        {showMonthly && (
          <View style={styles.monthPanel}>
            {/* Onglets mois */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthTabs}>
              {MONTHS_SHORT.map((m, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.mTab, selectedMonth === i && styles.mTabActive]}
                  onPress={() => setSelectedMonth(i)}
                >
                  <Text style={[styles.mTabText, selectedMonth === i && styles.mTabTextActive]}>
                    {m}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Détail du mois */}
            <View style={styles.monthDetail}>
              <View style={styles.monthTitleRow}>
                <Text style={styles.monthName}>{MONTHS[selectedMonth]} {new Date().getFullYear()}</Text>
                <View style={[styles.monthBadge, { backgroundColor: monthMsg.bg, borderColor: monthMsg.border }]}>
                  <Text style={[styles.monthBadgeText, { color: monthMsg.color }]}>
                    {selectedMonthData?.rate ?? 0}% réussite
                  </Text>
                </View>
              </View>

              {/* Stats du mois */}
              <View style={styles.monthStatsGrid}>
                <View style={styles.msBox}>
                  <Text style={[styles.msVal, { color: Colors.cyan }]}>{selectedMonthData?.created ?? 0}</Text>
                  <Text style={styles.msLbl}>Créées</Text>
                </View>
                <View style={styles.msBox}>
                  <Text style={[styles.msVal, { color: Colors.low }]}>{selectedMonthData?.done ?? 0}</Text>
                  <Text style={styles.msLbl}>Terminées</Text>
                </View>
                <View style={styles.msBox}>
                  <Text style={[styles.msVal, { color: Colors.urgent }]}>{selectedMonthData?.fail ?? 0}</Text>
                  <Text style={styles.msLbl}>Échecs</Text>
                </View>
                <View style={styles.msBox}>
                  <Text style={[styles.msVal, { color: Colors.medium }]}>{selectedMonthData?.late ?? 0}</Text>
                  <Text style={styles.msLbl}>En retard</Text>
                </View>
              </View>

              {/* Barres comparatives */}
              <Text style={styles.compareTitle}>RÉUSSITE VS ÉCHEC</Text>
              <View style={styles.compareRow}>
                <Text style={[styles.compareLbl, { color: Colors.low }]}>✅ Réussis — {rSuccMonth}%</Text>
                <View style={styles.compareTrack}>
                  <View style={[styles.compareFill, { width: `${rSuccMonth}%`, backgroundColor: Colors.low }]} />
                </View>
              </View>
              <View style={styles.compareRow}>
                <Text style={[styles.compareLbl, { color: Colors.urgent }]}>❌ Échecs — {rFailMonth}%</Text>
                <View style={styles.compareTrack}>
                  <View style={[styles.compareFill, { width: `${rFailMonth}%`, backgroundColor: Colors.urgent }]} />
                </View>
              </View>

              {/* Message motivation */}
              <View style={[styles.msgBox, { backgroundColor: monthMsg.bg, borderColor: monthMsg.border }]}>
                <Text style={[styles.msgText, { color: monthMsg.color }]}>{monthMsg.text}</Text>
              </View>
            </View>
          </View>
        )}

        {/* BOUTON BILAN ANNUEL */}
        <TouchableOpacity
          style={[styles.resumeBtn, styles.annualBtn]}
          onPress={() => setShowAnnual(!showAnnual)}
        >
          <Text style={[styles.resumeBtnText, { color: Colors.medium }]}>
            🏆 Bilan annuel {new Date().getFullYear()} {showAnnual ? '▴' : '▾'}
          </Text>
        </TouchableOpacity>

        {/* PANEL ANNUEL */}
        {showAnnual && (
          <View style={[styles.monthPanel, { borderColor: 'rgba(250,204,21,0.25)' }]}>
            <View style={styles.monthDetail}>
              <Text style={[styles.monthName, { color: Colors.medium, marginBottom: 10 }]}>
                🏆 Bilan complet {new Date().getFullYear()}
              </Text>

              {/* KPI annuels */}
              <View style={styles.monthStatsGrid}>
                <View style={styles.msBox}>
                  <Text style={[styles.msVal, { color: Colors.cyan }]}>{stats.totalCreated}</Text>
                  <Text style={styles.msLbl}>Créées</Text>
                </View>
                <View style={styles.msBox}>
                  <Text style={[styles.msVal, { color: Colors.low }]}>{stats.totalDone}</Text>
                  <Text style={styles.msLbl}>Terminées</Text>
                </View>
                <View style={styles.msBox}>
                  <Text style={[styles.msVal, { color: Colors.urgent }]}>{stats.totalFail}</Text>
                  <Text style={styles.msLbl}>Échecs</Text>
                </View>
                <View style={styles.msBox}>
                  <Text style={[styles.msVal, { color: Colors.medium }]}>{stats.totalLate}</Text>
                  <Text style={styles.msLbl}>En retard</Text>
                </View>
              </View>

              {/* Barres annuelles */}
              <Text style={styles.compareTitle}>TAUX GLOBAL RÉUSSITE VS ÉCHEC</Text>
              <View style={styles.compareRow}>
                <Text style={[styles.compareLbl, { color: Colors.low }]}>✅ Réussis — {rSuccAnnual}%</Text>
                <View style={styles.compareTrack}>
                  <View style={[styles.compareFill, { width: `${rSuccAnnual}%`, backgroundColor: Colors.low }]} />
                </View>
              </View>
              <View style={styles.compareRow}>
                <Text style={[styles.compareLbl, { color: Colors.urgent }]}>❌ Échecs — {rFailAnnual}%</Text>
                <View style={styles.compareTrack}>
                  <View style={[styles.compareFill, { width: `${rFailAnnual}%`, backgroundColor: Colors.urgent }]} />
                </View>
              </View>

              {/* Meilleur / Pire mois */}
              <View style={styles.bestWorstRow}>
                <View style={[styles.bestWorstBox, { backgroundColor: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.2)' }]}>
                  <Text style={styles.bestWorstLabel}>🏅 Meilleur mois</Text>
                  <Text style={[styles.bestWorstMonth, { color: Colors.low }]}>
                    {stats.bestMonth ? MONTHS[stats.bestMonth.month] : '—'}
                  </Text>
                  <Text style={styles.bestWorstRate}>
                    {stats.bestMonth?.rate ?? 0}% réussite
                  </Text>
                </View>
                <View style={[styles.bestWorstBox, { backgroundColor: 'rgba(220,38,38,0.08)', borderColor: 'rgba(220,38,38,0.2)' }]}>
                  <Text style={styles.bestWorstLabel}>⚠️ Mois difficile</Text>
                  <Text style={[styles.bestWorstMonth, { color: Colors.urgent }]}>
                    {stats.worstMonth ? MONTHS[stats.worstMonth.month] : '—'}
                  </Text>
                  <Text style={styles.bestWorstRate}>
                    {stats.worstMonth?.rate ?? 0}% réussite
                  </Text>
                </View>
              </View>

              {/* Score global */}
              <Text style={styles.compareTitle}>SCORE GLOBAL DE DISCIPLINE</Text>
              <View style={styles.compareTrack}>
                <View style={[styles.compareFill, {
                  width: `${stats.globalRate}%`,
                  backgroundColor: annualMsg.color,
                }]} />
              </View>
              <Text style={[styles.globalRateText, { color: annualMsg.color }]}>
                {stats.globalRate}%
              </Text>

              {/* Message annuel */}
              <View style={[styles.msgBox, { backgroundColor: annualMsg.bg, borderColor: annualMsg.border, marginTop: 10 }]}>
                <Text style={[styles.msgText, { color: annualMsg.color }]}>{annualMsg.text}</Text>
              </View>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  )
}


// STYLES

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.text, letterSpacing: -0.5 },
  headerSub: { fontSize: 12, color: Colors.muted, marginTop: 2 },
  headerIcon: { fontSize: 26 },

  // KPI
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 12, marginBottom: 10 },
  kpiBox: { width: '47%', borderRadius: 12, padding: 12, borderWidth: 1 },
  kpiVal: { fontSize: 22, fontWeight: '800', lineHeight: 26 },
  kpiLbl: { fontSize: 10, color: Colors.muted, marginTop: 3 },

  // Streak
  streakBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 12, marginBottom: 10, backgroundColor: 'rgba(250,204,21,0.08)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(250,204,21,0.2)' },
  streakText: { fontSize: 13, fontWeight: '600', color: Colors.text },
  streakVal: { fontSize: 13, fontWeight: '700', color: Colors.medium },

  // Graphique
  chartWrap: { marginHorizontal: 12, marginBottom: 10, backgroundColor: Colors.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.border },
  chartTitle: { fontSize: 9, fontWeight: '700', color: Colors.muted, letterSpacing: 0.8, marginBottom: 10 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: 70, gap: 3 },
  barCol: { flex: 1, alignItems: 'center', gap: 3 },
  barFill: { width: '100%', borderRadius: 3 },
  barLbl: { fontSize: 7.5, color: Colors.muted },
  legend: { flexDirection: 'row', gap: 10, marginTop: 8, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 7, height: 7, borderRadius: 2 },
  legendText: { fontSize: 9, color: Colors.muted },

  // Boutons résumé
  resumeBtn: { marginHorizontal: 12, marginBottom: 8, padding: 12, borderRadius: 12, backgroundColor: 'rgba(59,130,246,0.12)', borderWidth: 1, borderColor: 'rgba(6,182,212,0.3)', alignItems: 'center' },
  annualBtn: { backgroundColor: 'rgba(250,204,21,0.08)', borderColor: 'rgba(250,204,21,0.25)' },
  resumeBtnText: { fontSize: 13, fontWeight: '700', color: Colors.cyan },

  // Panel mensuel / annuel
  monthPanel: { marginHorizontal: 12, marginBottom: 10, backgroundColor: Colors.surface2, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(6,182,212,0.2)', overflow: 'hidden' },
  monthTabs: { paddingHorizontal: 10, paddingTop: 10 },
  mTab: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, marginRight: 5 },
  mTabActive: { backgroundColor: Colors.cyan, borderColor: Colors.cyan },
  mTabText: { fontSize: 10, fontWeight: '700', color: Colors.muted },
  mTabTextActive: { color: Colors.bg },
  monthDetail: { padding: 14 },
  monthTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  monthName: { fontSize: 13, fontWeight: '700', color: Colors.text },
  monthBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  monthBadgeText: { fontSize: 10, fontWeight: '700' },
  monthStatsGrid: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  msBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  msVal: { fontSize: 16, fontWeight: '800' },
  msLbl: { fontSize: 9, color: Colors.muted, marginTop: 2 },

  // Barres comparatives
  compareTitle: { fontSize: 9, fontWeight: '700', color: Colors.muted, letterSpacing: 0.5, marginBottom: 6 },
  compareRow: { marginBottom: 8 },
  compareLbl: { fontSize: 10, fontWeight: '600', marginBottom: 3 },
  compareTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.07)', overflow: 'hidden' },
  compareFill: { height: '100%', borderRadius: 3 },

  // Message motivation
  msgBox: { borderRadius: 10, padding: 10, borderWidth: 1, marginTop: 10 },
  msgText: { fontSize: 11, lineHeight: 17, fontStyle: 'italic' },

  // Meilleur/Pire mois
  bestWorstRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  bestWorstBox: { flex: 1, borderRadius: 8, padding: 8, borderWidth: 1 },
  bestWorstLabel: { fontSize: 9, color: Colors.muted, marginBottom: 3 },
  bestWorstMonth: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  bestWorstRate: { fontSize: 10, color: Colors.muted },

  // Score global
  globalRateText: { fontSize: 13, fontWeight: '800', textAlign: 'right', marginTop: 4 },
})