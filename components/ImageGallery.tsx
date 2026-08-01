// ================================================
// GALERIE D'IMAGES — RyanTask's
// CDC §5.2 — Photos multiples par article
// ================================================

import { useState } from 'react'
import {
  View, Text, TouchableOpacity, Image,
  StyleSheet, ScrollView, Alert, ActivityIndicator,
  Modal, Dimensions,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Colors } from '../constants/colors'
import { ProgImage } from '../types'
import { progService } from '../lib/supabase'

interface ImageGalleryProps {
  progItemId: string
  images: ProgImage[]
  onImagesChange: (images: ProgImage[]) => void
}

const { width: SCREEN_WIDTH } = Dimensions.get('window')

export default function ImageGallery({ progItemId, images, onImagesChange }: ImageGalleryProps) {
  const insets = useSafeAreaInsets()
  const [uploading, setUploading] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  const pickAndUploadImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert(
        'Permission refusée',
        'RyanTask\'s a besoin d\'accéder à ta galerie pour ajouter des photos.',
      )
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    })

    if (result.canceled || !result.assets[0]) return

    setUploading(true)
    const newImage = await progService.uploadImage(
      progItemId,
      result.assets[0].uri,
      images.length
    )
    setUploading(false)

    if (newImage) {
      onImagesChange([...images, newImage])
    } else {
      Alert.alert('Erreur', 'Impossible d\'uploader l\'image. Réessaie.')
    }
  }

  const handleRemoveImage = (image: ProgImage) => {
    Alert.alert(
      'Supprimer la photo',
      'Veux-tu vraiment supprimer cette photo ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            const success = await progService.deleteImage(image.id, image.url)
            if (success) {
              onImagesChange(images.filter(img => img.id !== image.id))
            }
          },
        },
      ]
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        Photos {images.length > 0 ? `(${images.length})` : ''}
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
        {images.map(image => (
          <View key={image.id} style={styles.thumbWrap}>
            <TouchableOpacity onPress={() => setPreviewImage(image.url)}>
              <Image source={{ uri: image.url }} style={styles.thumb} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => handleRemoveImage(image)}
            >
              <Text style={styles.removeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity
          style={styles.addThumb}
          onPress={pickAndUploadImage}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color={Colors.cyan} />
          ) : (
            <>
              <Text style={styles.addThumbIcon}>+</Text>
              <Text style={styles.addThumbText}>Ajouter</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Preview plein écran */}
      <Modal
        visible={!!previewImage}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImage(null)}
      >
        <TouchableOpacity
          style={styles.previewOverlay}
          activeOpacity={1}
          onPress={() => setPreviewImage(null)}
        >
          {previewImage && (
            <Image
              source={{ uri: previewImage }}
              style={{ width: SCREEN_WIDTH - 40, height: SCREEN_WIDTH - 40, borderRadius: 16 }}
              resizeMode="contain"
            />
          )}
          <TouchableOpacity
            style={[styles.previewClose, { top: Math.max(insets.top + 12, 50) }]}
            onPress={() => setPreviewImage(null)}
          >
            <Text style={styles.previewCloseText}>✕</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { marginTop: 4 },
  label: { fontSize: 12, fontWeight: '600', color: Colors.text2, marginBottom: 8 },
  scroll: { flexDirection: 'row' },

  thumbWrap: { marginRight: 8, position: 'relative' },
  thumb: {
    width: 70, height: 70, borderRadius: 12,
    backgroundColor: Colors.surface2,
    borderWidth: 1, borderColor: Colors.border,
  },
  removeBtn: {
    position: 'absolute', top: -6, right: -6,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: Colors.urgent,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.bg,
  },
  removeBtnText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  addThumb: {
    width: 70, height: 70, borderRadius: 12,
    borderWidth: 1.5, borderColor: 'rgba(6,182,212,0.35)',
    borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(6,182,212,0.05)',
  },
  addThumbIcon: { fontSize: 22, color: Colors.cyan, fontWeight: '300', lineHeight: 24 },
  addThumbText: { fontSize: 8, color: Colors.cyan, marginTop: 2 },

  previewOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center', justifyContent: 'center',
  },
  previewClose: {
    position: 'absolute', top: 50, right: 24,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  previewCloseText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
