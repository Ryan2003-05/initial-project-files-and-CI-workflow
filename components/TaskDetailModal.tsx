// ================================================
// MODAL DÉTAIL TÂCHE — RyanTask's
// Voir + checklist + modifier + supprimer
// ================================================

import { useState, useEffect } from 'react'
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, KeyboardAvoidingView, Platform,
  Switch, Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Colors, PriorityColors } from '../constants/colors'
import { Task, Priority, ChecklistItem } from '../types'
import { checklistService } from '../lib/supabase'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

interface TaskDetailModalProps {
  visible: boolean
  task: Task | null
  onClose: () => void
  onUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>
  onDelete: (taskId: string) => Promise<void>
  onComplete: (taskId: string) => Promise<void>
  onRefresh: () => Promise<void>
}

export default function TaskDetailModal({
  visible, task, onClose, onUpdate, onDelete, onComplete, onRefresh,
}: TaskDetailModalProps) {
  const insets = useSafeAreaInsets()
  const [editMode, setEditMode] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Priority>('moyenne')
  const [dateDisplay, setDateDisplay] = useState('')
  const [time, setTime] = useState('')
  const [reminderEnabled, setReminderEnabled] = useState(false)
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [newChecklistItem, setNewChecklistItem] = useState('')
  const [saving, setSaving] = useState(false)

  // Synchronise le formulaire quand la tâche change
  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description || '')
      setPriority(task.priority)
      const d = parseISO(task.deadline_date)
      setDateDisplay(format(d, 'dd/MM/yyyy'))
      setTime(task.deadline_time || '')
      setReminderEnabled(task.reminder_enabled)
      setChecklist(task.checklist || [])
      setEditMode(false)
    }
  }, [task])

  if (!task) return null

  const priorityColor = PriorityColors[task.priority]
  const doneCount = checklist.filter(c => c.is_done).length
  const progress = checklist.length > 0 ? Math.round((doneCount / checklist.length) * 100) : 0

  // ----------------
  // Toggle checklist item
  // ----------------
  const handleToggleItem = async (item: ChecklistItem) => {
    const newState = !item.is_done
    setChecklist(checklist.map(c => c.id === item.id ? { ...c, is_done: newState } : c))
    await checklistService.toggleItem(item.id, newState)
  }

  // ----------------
  // Ajouter un item checklist
  // ----------------
  const handleAddChecklistItem = async () => {
    if (!newChecklistItem.trim()) return
    const newItem = await checklistService.addItem(
      task.id,
      newChecklistItem.trim(),
      checklist.length
    )
    if (newItem) {
      setChecklist([...checklist, newItem])
      setNewChecklistItem('')
    }
  }

  // ----------------
  // Supprimer un item checklist
  // ----------------
  const handleRemoveChecklistItem = async (itemId: string) => {
    await checklistService.deleteItem(itemId)
    setChecklist(checklist.filter(c => c.id !== itemId))
  }

  // ----------------
  // Sauvegarder les modifications
  // ----------------
  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Erreur', 'Le titre est obligatoire.')
      return
    }

    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/
    const match = dateDisplay.match(dateRegex)
    if (!match) {
      Alert.alert('Erreur', 'Format de date invalide (JJ/MM/AAAA)')
      return
    }
    const [, day, month, year] = match
    const isoDate = `${year}-${month}-${day}`

    setSaving(true)
    await onUpdate(task.id, {
      title: title.trim(),
      description: description.trim() || null,
      priority,
      deadline_date: isoDate,
      deadline_time: time.trim() || null,
      reminder_enabled: reminderEnabled,
    })
    setSaving(false)
    setEditMode(false)
    await onRefresh()
  }

  // ----------------
  // Supprimer la tâche
  // ----------------
  const handleDelete = () => {
    Alert.alert(
      'Supprimer la tâche',
      'Cette action est irréversible. Confirmer la suppression ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await onDelete(task.id)
            onClose()
          },
        },
      ]
    )
  }

  // ----------------
  // Terminer la tâche
  // ----------------
  
  const priorities: { key: Priority; label: string }[] = [
    { key: 'urgente', label: '🔴 Urgente' },
    { key: 'moyenne', label: '🟡 Moyenne' },
    { key: 'basse', label: '🟢 Basse' },
  ]

  // Auto-formatage date avec slashs (mode édition)
  const handleDateChange = (text: string) => {
    let cleaned = text.replace(/[^\d]/g, '')
    if (cleaned.length > 8) cleaned = cleaned.slice(0, 8)
    let formatted = cleaned
    if (cleaned.length >= 5) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4)}`
    } else if (cleaned.length >= 3) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`
    }
    setDateDisplay(formatted)
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.sheet}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {editMode ? '✏️ Modifier la tâche' : 'Détail de la tâche'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={[
              styles.bodyContent,
              { paddingBottom: Math.max(insets.bottom + 30, 52) },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >

            {!editMode ? (
              // ============ MODE LECTURE ============
              <>
                <View style={styles.titleRow}>
                  <Text style={styles.viewTitle}>{task.title}</Text>
                  <View style={[styles.badge, { backgroundColor: priorityColor.bg, borderColor: priorityColor.border }]}>
                    <Text style={[styles.badgeText, { color: priorityColor.text }]}>
                      {task.priority.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {task.description && (
                  <Text style={styles.viewDesc}>{task.description}</Text>
                )}

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>📅 Échéance</Text>
                  <Text style={styles.infoValue}>
                    {format(parseISO(task.deadline_date), 'd MMMM yyyy', { locale: fr })}
                    {task.deadline_time ? ` à ${task.deadline_time}` : ''}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>🔔 Rappel</Text>
                  <Text style={styles.infoValue}>{task.reminder_enabled ? 'Activé' : 'Désactivé'}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>📊 Statut</Text>
                  <Text style={[
                    styles.infoValue,
                    task.status === 'en_retard' && { color: Colors.urgent },
                  ]}>
                    {task.status === 'active' ? 'Active' : task.status === 'en_retard' ? 'En retard' : 'Terminée'}
                  </Text>
                </View>

                {/* Checklist */}
                <View style={styles.checklistSection}>
                  <View style={styles.checklistHeader}>
                    <Text style={styles.label}>Checklist</Text>
                    {checklist.length > 0 && (
                      <Text style={styles.progressLabel}>{doneCount}/{checklist.length} · {progress}%</Text>
                    )}
                  </View>

                  {checklist.length > 0 && (
                    <View style={styles.progressBarWrap}>
                      <View style={[styles.progressFill, { width: `${progress}%` }]} />
                    </View>
                  )}

                  {checklist.map(item => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.checklistRow}
                      onPress={() => handleToggleItem(item)}
                    >
                      <View style={[styles.checkbox, item.is_done && styles.checkboxDone]}>
                        {item.is_done && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                      <Text style={[
                        styles.checklistLabel,
                        item.is_done && styles.checklistLabelDone,
                      ]}>
                        {item.label}
                      </Text>
                      <TouchableOpacity onPress={() => handleRemoveChecklistItem(item.id)}>
                        <Text style={styles.checklistRemove}>✕</Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}

                  <View style={styles.checklistAddRow}>
                    <TextInput
                      style={[styles.input, styles.checklistInput]}
                      placeholder="Ajouter une sous-tâche..."
                      placeholderTextColor={Colors.muted}
                      value={newChecklistItem}
                      onChangeText={setNewChecklistItem}
                      onSubmitEditing={handleAddChecklistItem}
                    />
                    <TouchableOpacity style={styles.checklistAddBtn} onPress={handleAddChecklistItem}>
                      <Text style={styles.checklistAddBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Action terminer */}
                <TouchableOpacity
                  style={styles.completeBtn}
                  onPress={() => {
                    Alert.alert(
                      'Marquer comme terminée ?',
                      'Le résultat (réussi/échec) sera calculé automatiquement selon la date d\'échéance.',
                      [
                        { text: 'Annuler', style: 'cancel' },
                        {
                          text: 'Terminer',
                          onPress: async () => {
                            await onComplete(task.id)
                            onClose()
                          },
                        },
                      ]
                    )
                  }}
                >
                  <Text style={styles.completeBtnText}>🏁 Marquer comme terminée</Text>
                </TouchableOpacity>

                {/* Modifier / Supprimer */}
                <View style={styles.bottomActions}>
                  <TouchableOpacity style={styles.editBtn} onPress={() => setEditMode(true)}>
                    <Text style={styles.editBtnText}>✏️ Modifier</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                    <Text style={styles.deleteBtnText}>🗑️ Supprimer</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              // ============ MODE ÉDITION ============
              <>
                <View style={styles.field}>
                  <Text style={styles.label}>Titre *</Text>
                  <TextInput
                    style={styles.input}
                    value={title}
                    onChangeText={setTitle}
                    placeholderTextColor={Colors.muted}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Description</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={3}
                    placeholderTextColor={Colors.muted}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Priorité</Text>
                  <View style={styles.priorityRow}>
                    {priorities.map(p => {
                      const colors = PriorityColors[p.key]
                      const isActive = priority === p.key
                      return (
                        <TouchableOpacity
                          key={p.key}
                          style={[
                            styles.priorityBtn,
                            {
                              backgroundColor: isActive ? colors.bg : 'transparent',
                              borderColor: isActive ? colors.border : Colors.border,
                            },
                          ]}
                          onPress={() => setPriority(p.key)}
                        >
                          <Text style={[styles.priorityBtnText, { color: isActive ? colors.text : Colors.muted }]}>
                            {p.label}
                          </Text>
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Date d'échéance * (JJ/MM/AAAA)</Text>
                  <TextInput
                    style={styles.input}
                    value={dateDisplay}
                    onChangeText={handleDateChange}
                    keyboardType="numbers-and-punctuation"
                    maxLength={10}
                    placeholderTextColor={Colors.muted}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Heure (HH:MM)</Text>
                  <TextInput
                    style={styles.input}
                    value={time}
                    onChangeText={setTime}
                    keyboardType="numbers-and-punctuation"
                    placeholderTextColor={Colors.muted}
                  />
                </View>

                <View style={[styles.field, styles.switchRow]}>
                  <Text style={styles.label}>🔔 Rappel</Text>
                  <Switch
                    value={reminderEnabled}
                    onValueChange={setReminderEnabled}
                    trackColor={{ false: Colors.surface2, true: Colors.cyan }}
                    thumbColor="#fff"
                  />
                </View>

                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setEditMode(false)}
                  >
                    <Text style={styles.cancelBtnText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                    onPress={handleSave}
                    disabled={saving}
                  >
                    <Text style={styles.saveBtnText}>
                      {saving ? 'Sauvegarde...' : '💾 Sauvegarder'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ------------------------------------------------
// STYLES
// ------------------------------------------------
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%', paddingTop: 8 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  closeBtn: { fontSize: 20, color: Colors.muted },

  body: { paddingHorizontal: 20, paddingTop: 16 },
  bodyContent: { paddingBottom: 52 },

  // Mode lecture
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  viewTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, flex: 1, marginRight: 10 },
  badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  viewDesc: { fontSize: 13, color: Colors.text2, lineHeight: 19, marginBottom: 16 },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  infoLabel: { fontSize: 12, color: Colors.muted },
  infoValue: { fontSize: 13, color: Colors.text, fontWeight: '600' },

  // Checklist
  checklistSection: { marginTop: 18 },
  checklistHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressLabel: { fontSize: 11, color: Colors.text2 },
  progressBarWrap: { height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, marginBottom: 12, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.cyan, borderRadius: 2 },

  checklistRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxDone: { backgroundColor: Colors.cyan, borderColor: Colors.cyan },
  checkmark: { color: Colors.bg, fontSize: 12, fontWeight: '700' },
  checklistLabel: { flex: 1, fontSize: 13, color: Colors.text },
  checklistLabelDone: { color: Colors.muted, textDecorationLine: 'line-through' },
  checklistRemove: { fontSize: 13, color: Colors.urgent, paddingHorizontal: 4 },

  checklistAddRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  checklistInput: { flex: 1 },
  checklistAddBtn: { width: 44, height: 44, borderRadius: 10, backgroundColor: Colors.cyan, alignItems: 'center', justifyContent: 'center' },
  checklistAddBtnText: { fontSize: 20, color: '#fff', fontWeight: '300' },

  // Actions terminer
  completeBtn: { marginTop: 20, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: 'rgba(6,182,212,0.15)', borderWidth: 1, borderColor: 'rgba(6,182,212,0.3)' },
  completeBtnText: { fontSize: 14, fontWeight: '700', color: Colors.cyan },
  // Modifier/Supprimer
  bottomActions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  editBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  editBtnText: { fontSize: 13, fontWeight: '600', color: Colors.text },
  deleteBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center' },
  deleteBtnText: { fontSize: 13, fontWeight: '600', color: Colors.muted },

  // Mode édition
  field: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: Colors.text2, marginBottom: 8 },
  input: { backgroundColor: Colors.surface, borderRadius: 12, padding: 14, color: Colors.text, fontSize: 14, borderWidth: 1, borderColor: Colors.border },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  priorityRow: { flexDirection: 'row', gap: 8 },
  priorityBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  priorityBtnText: { fontSize: 12, fontWeight: '600' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  editActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: Colors.text2 },
  saveBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: Colors.cyan, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: Colors.bg },
})
