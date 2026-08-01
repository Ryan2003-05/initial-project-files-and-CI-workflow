// AVATAR PICKER — RyanTask's
// Sélection photo depuis galerie + upload Supabase


import { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, Image,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { profileService } from '../lib/supabase'
import { Colors } from '../constants/colors'

interface AvatarPickerProps {
  userId: string
  size?: number
  initials?: string
  onAvatarUpdated?: (url: string) => void
}

export default function AvatarPicker({
  userId,
  size = 36,
  initials = 'RN',
  onAvatarUpdated,
}: AvatarPickerProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    loadAvatar()
  }, [userId])

  const loadAvatar = async () => {
    const profile = await profileService.getProfile(userId)
    if (profile?.avatar_url) {
      setAvatarUrl(profile.avatar_url)
    }
  }

  const pickImage = async () => {
    // Demande la permission d'accès à la galerie
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert(
        'Permission refusée',
        'RyanTask\'s a besoin d\'accéder à ta galerie pour changer ta photo de profil.',
        [{ text: 'OK' }]
      )
      return
    }

    // Ouvre la galerie
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })

    if (result.canceled || !result.assets[0]) return

    const imageUri = result.assets[0].uri
    await uploadAvatar(imageUri)
  }

  const uploadAvatar = async (uri: string) => {
    setUploading(true)
    try {
      // Upload vers Supabase Storage
      const publicUrl = await profileService.uploadAvatar(userId, uri)

      if (publicUrl) {
        // Sauvegarde l'URL dans le profil
        await profileService.updateProfile(userId, { avatar_url: publicUrl })
        setAvatarUrl(publicUrl)
        onAvatarUpdated?.(publicUrl)
        Alert.alert('✅ Succès', 'Photo de profil mise à jour !')
      } else {
        Alert.alert('Erreur', 'Impossible d\'uploader la photo. Réessaie.')
      }
    } catch (error) {
      console.error('uploadAvatar error:', error)
      Alert.alert('Erreur', 'Une erreur est survenue lors de l\'upload.')
    }
    setUploading(false)
  }

  return (
    <TouchableOpacity
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
      onPress={pickImage}
      disabled={uploading}
    >
      {uploading ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={[
            styles.avatarImage,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
        />
      ) : (
        <Text style={[styles.initials, { fontSize: size * 0.33 }]}>
          {initials}
        </Text>
      )}

      {/* Indicateur de modification */}
      {!uploading && (
        <View style={[styles.editBadge, { width: size * 0.35, height: size * 0.35, borderRadius: size * 0.175 }]}>
          <Text style={{ fontSize: size * 0.16, color: '#fff' }}>✎</Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.borderCyan,
    overflow: 'visible',
    position: 'relative',
  },
  avatarImage: {
    position: 'absolute',
  },
  initials: {
    color: '#fff',
    fontWeight: '700',
  },
  editBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: Colors.cyan,
    borderWidth: 1.5,
    borderColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
})