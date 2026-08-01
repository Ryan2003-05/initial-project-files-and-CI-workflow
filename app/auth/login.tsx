
// ÉCRAN LOGIN — RyanTask's
// Connexion Email + Password


import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView, Alert, Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { authRepository } from '../../lib/supabase'
import { Colors } from '../../constants/colors'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Remplis tous les champs.')
      return
    }

    setLoading(true)
    const { error } = await authRepository.signInWithPassword({
      email: email.trim(),
      password,
    })
    setLoading(false)

    if (error) {
      Alert.alert('Connexion échouée', error.message)
    }
    // Si succès → _layout.tsx redirige automatiquement vers (tabs)
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >

          {/* LOGO & TITRE */}
          <View style={styles.logoWrap}>
            <View style={styles.logoBox}>
              <Image
                source={require('../../assets/icon.png')}
                style={{ width: 64, height: 64, borderRadius: 16 }}
              />
            </View>
            <Text style={styles.appName}>RyanTask's</Text>
            <Text style={styles.tagline}>Ta discipline détermine ton futur</Text>
          </View>

          {/* FORMULAIRE */}
          <View style={styles.form}>
            <Text style={styles.formTitle}>Connexion</Text>

            {/* Email */}
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="ton@email.com"
                placeholderTextColor={Colors.muted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Password */}
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>Mot de passe</Text>
              <View style={styles.passwordWrap}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.muted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Bouton connexion */}
            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Se connecter</Text>
              )}
            </TouchableOpacity>

            {/* Séparateur */}
            <View style={styles.separator}>
              <View style={styles.separatorLine} />
              <Text style={styles.separatorText}>ou</Text>
              <View style={styles.separatorLine} />
            </View>

            {/* Lien inscription */}
            <TouchableOpacity
              style={styles.registerBtn}
              onPress={() => router.push('/auth/register')}
            >
              <Text style={styles.registerText}>
                Pas encore de compte ?{' '}
                <Text style={styles.registerLink}>S'inscrire</Text>
              </Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}


// STYLES

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },

  // Logo
  logoWrap: { alignItems: 'center', marginBottom: 40 },
  logoBox: { width: 72, height: 72, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderCyan, alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowColor: Colors.cyan, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  logoEmoji: { fontSize: 36 },
  appName: { fontSize: 28, fontWeight: '800', color: Colors.text, letterSpacing: -0.5, marginBottom: 6 },
  tagline: { fontSize: 13, color: Colors.muted, fontStyle: 'italic' },

  // Form
  form: { backgroundColor: Colors.surface, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: Colors.border },
  formTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 20 },

  // Inputs
  inputWrap: { marginBottom: 16 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: Colors.text2, marginBottom: 6 },
  input: { backgroundColor: Colors.bg, borderRadius: 12, padding: 14, color: Colors.text, fontSize: 14, borderWidth: 1, borderColor: Colors.border },
  passwordWrap: { position: 'relative' },
  passwordInput: { paddingRight: 48 },
  eyeBtn: { position: 'absolute', right: 14, top: 14 },
  eyeIcon: { fontSize: 16 },

  // Bouton
  btn: { backgroundColor: Colors.cyan, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8, shadowColor: Colors.cyan, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 6 },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: 15, fontWeight: '700', color: Colors.bg },

  // Séparateur
  separator: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 10 },
  separatorLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  separatorText: { fontSize: 12, color: Colors.muted },

  // Inscription
  registerBtn: { alignItems: 'center' },
  registerText: { fontSize: 13, color: Colors.muted },
  registerLink: { color: Colors.cyan, fontWeight: '700' },
})