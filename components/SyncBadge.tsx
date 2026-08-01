// ================================================
// SYNC BADGE — RyanTask's
// Indicateur visuel de synchronisation
// ================================================

import { View, Text, StyleSheet } from 'react-native'

interface SyncBadgeProps {
  status: string | undefined
}

export default function SyncBadge({ status }: SyncBadgeProps) {
  if (!status || status === 'synced') return null

  const config = {
    pending: { icon: '🌫️', color: 'rgba(148,163,184,0.2)', border: 'rgba(148,163,184,0.3)' },
    syncing: { icon: '🔄', color: 'rgba(59,130,246,0.2)', border: 'rgba(59,130,246,0.3)' },
    failed: { icon: '⚠️', color: 'rgba(239,68,68,0.2)', border: 'rgba(239,68,68,0.3)' },
    pending_delete: { icon: '🗑️', color: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)' },
  }[status] ?? { icon: '🌫️', color: 'rgba(148,163,184,0.2)', border: 'rgba(148,163,184,0.3)' }

  return (
    <View style={[styles.badge, { backgroundColor: config.color, borderColor: config.border }]}>
      <Text style={styles.icon}>{config.icon}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 10 },
})