// ================================================
// MODAL CRÉATION TÂCHE — RyanTask's
// CDC §3.1 (champs), §3.3 (checklist), §3.6 (rappel)
// ================================================

import { useState } from 'react'
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, KeyboardAvoidingView, Platform,
  Switch, Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Colors, PriorityColors } from '../constants/colors'
import { Priority } from '../types'

interface TaskFormModalProps {
  visible: boolean
  onClose: () => void
  onSubmit: (data: {
    title: string
    description: string
    priority: Priority
    deadline_date: string
    deadline_time: string | null
    reminder_enabled: boolean
    checklist: string[]
  }) => Promise<void>
}

export default function TaskFormModal({ visible, onClose, onSubmit }: TaskFormModalProps) {
  const insets = useSafeAreaInsets()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Priority>('moyenne')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [reminderEnabled, setReminderEnabled] = useState(false)
  const [checklistItems, setChecklistItems] = useState<string[]>([])
  const [newChecklistItem, setNewChecklistItem] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setPriority('moyenne')
    setDate('')
    setTime('')
    setReminderEnabled(false)
    setChecklistItems([])
    setNewChecklistItem('')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const addChecklistItem = () => {
    if (newChecklistItem.trim()) {
      setChecklistItems([...checklistItems, newChecklistItem.trim()])
      setNewChecklistItem('')
    }
  }

  const removeChecklistItem = (index: number) => {
    setChecklistItems(checklistItems.filter((_, i) => i !== index))
  }

  // Auto-formatage de la date avec slashs au fur et à mesure
  const handleDateChange = (text: string) => {
    let cleaned = text.replace(/[^\d]/g, '')
    if (cleaned.length > 8) cleaned = cleaned.slice(0, 8)
    let formatted = cleaned
    if (cleaned.length >= 5) {
      formatted = `${cleaned.slice(0,2)}/${cleaned.slice(2,4)}/${cleaned.slice(4)}`
    } else if (cleaned.length >= 3) {
      formatted = `${cleaned.slice(0,2)}/${cleaned.slice(2)}`
    }
    setDate(formatted)
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Erreur', 'Le titre de la tâche est obligatoire.')
      return
    }
    if (!date.trim()) {
      Alert.alert('Erreur', 'La date d\'échéance est obligatoire.')
      return
    }

    // Validation format JJ/MM/AAAA
    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/
    const match = date.match(dateRegex)
    if (!match) {
      Alert.alert('Erreur', 'Format de date invalide. Utilise JJ/MM/AAAA (ex: 20/06/2026)')
      return
    }
    const [, day, month, year] = match
    const isoDate = `${year}-${month}-${day}` // conversion pour la BDD

    setSubmitting(true)
    await onSubmit({
      title: title.trim(),
      description: description.trim(),
      priority,
      deadline_date: isoDate,
      deadline_time: time.trim() || null,
      reminder_enabled: reminderEnabled,
      checklist: checklistItems,
    })
    setSubmitting(false)
    resetForm()
  }

  const priorities: { key: Priority; label: string }[] = [
    { key: 'urgente', label: '🔴 Urgente' },
    { key: 'moyenne', label: '🟡 Moyenne' },
    { key: 'basse', label: '🟢 Basse' },
  ]

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.sheet}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Nouvelle tâche</Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.form}
            contentContainerStyle={[
              styles.formContent,
              { paddingBottom: Math.max(insets.bottom + 28, 48) },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >

            {/* Titre */}
            <View style={styles.field}>
              <Text style={styles.label}>Titre *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Préparer la présentation client"
                placeholderTextColor={Colors.muted}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* Description */}
            <View style={styles.field}>
              <Text style={styles.label}>Description (optionnel)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Détails de la tâche..."
                placeholderTextColor={Colors.muted}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Priorité */}
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
                      <Text style={[
                        styles.priorityBtnText,
                        { color: isActive ? colors.text : Colors.muted },
                      ]}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>

            {/* Date échéance */}
            <View style={styles.field}>
              <Text style={styles.label}>Date d'échéance * (JJ/MM/AAAA)</Text>
              <TextInput
                style={styles.input}
                placeholder="20/06/2026"
                placeholderTextColor={Colors.muted}
                value={date}
                onChangeText={handleDateChange}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
              />
            </View>

            {/* Heure échéance */}
            <View style={styles.field}>
              <Text style={styles.label}>Heure (optionnel — HH:MM)</Text>
              <TextInput
                style={styles.input}
                placeholder="14:30"
                placeholderTextColor={Colors.muted}
                value={time}
                onChangeText={setTime}
                keyboardType="numbers-and-punctuation"
              />
            </View>

            {/* Rappel */}
            <View style={[styles.field, styles.switchRow]}>
              <Text style={styles.label}>🔔 Activer un rappel</Text>
              <Switch
                value={reminderEnabled}
                onValueChange={setReminderEnabled}
                trackColor={{ false: Colors.surface2, true: Colors.cyan }}
                thumbColor="#fff"
              />
            </View>

            {/* Checklist */}
            <View style={styles.field}>
              <Text style={styles.label}>Checklist (sous-tâches)</Text>

              {checklistItems.map((item, index) => (
                <View key={index} style={styles.checklistItem}>
                  <Text style={styles.checklistText}>• {item}</Text>
                  <TouchableOpacity onPress={() => removeChecklistItem(index)}>
                    <Text style={styles.checklistRemove}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}

              <View style={styles.checklistAddRow}>
                <TextInput
                  style={[styles.input, styles.checklistInput]}
                  placeholder="Ajouter une sous-tâche..."
                  placeholderTextColor={Colors.muted}
                  value={newChecklistItem}
                  onChangeText={setNewChecklistItem}
                  onSubmitEditing={addChecklistItem}
                />
                <TouchableOpacity style={styles.checklistAddBtn} onPress={addChecklistItem}>
                  <Text style={styles.checklistAddBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* Bouton submit */}
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <Text style={styles.submitBtnText}>
                {submitting ? 'Création...' : '✅ Créer la tâche'}
              </Text>
            </TouchableOpacity>
          </View>

        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}


// STYLES

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', paddingTop: 8 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  closeBtn: { fontSize: 20, color: Colors.muted },

  form: { paddingHorizontal: 20, paddingTop: 16 },
  formContent: { paddingBottom: 48 },
  field: { marginBottom: 18 },
  label: { fontSize: 12, fontWeight: '600', color: Colors.text2, marginBottom: 8 },
  input: { backgroundColor: Colors.surface, borderRadius: 12, padding: 14, color: Colors.text, fontSize: 14, borderWidth: 1, borderColor: Colors.border },
  textArea: { minHeight: 70, textAlignVertical: 'top' },

  priorityRow: { flexDirection: 'row', gap: 8 },
  priorityBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  priorityBtnText: { fontSize: 12, fontWeight: '600' },

  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  checklistItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 8, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: Colors.border },
  checklistText: { fontSize: 13, color: Colors.text, flex: 1 },
  checklistRemove: { fontSize: 14, color: Colors.urgent, paddingLeft: 10 },

  checklistAddRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  checklistInput: { flex: 1 },
  checklistAddBtn: { width: 48, height: 48, borderRadius: 12, backgroundColor: Colors.cyan, alignItems: 'center', justifyContent: 'center' },
  checklistAddBtnText: { fontSize: 22, color: '#fff', fontWeight: '300' },

  footer: { paddingHorizontal: 20, paddingTop: 10, backgroundColor: Colors.bg },
  submitBtn: { backgroundColor: Colors.cyan, padding: 16, alignItems: 'center', borderRadius: 14, shadowColor: Colors.cyan, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: Colors.bg },
})
