// ÉCRAN INSCRIPTION — RyanTask's
// Création de compte Email + Password


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

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleRegister = async () => {
    // Validations
    if (!fullName || !email || !password || !confirmPassword) {
      Alert.alert('Erreur', 'Remplis tous les champs.')
      return
    }
    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.')
      return
    }
    if (password.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères.')
      return
    }

    setLoading(true)
    const { error } = await authRepository.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
        },
      },
    })
    setLoading(false)

    if (error) {
      Alert.alert('Inscription échouée', error.message)
    } else {
      Alert.alert(
        '🎉 Compte créé !',
        'Bienvenue sur RyanTask\'s. Commence à cultiver ta discipline dès maintenant !',
        [{ text: 'C\'est parti !', onPress: () => { } }]
      )
      // _layout.tsx redirige automatiquement vers (tabs)
    }
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
            <Text style={styles.formTitle}>Inscription</Text>

            {/* Nom complet */}
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>Nom complet</Text>
              <TextInput
                style={styles.input}
                placeholder="Ryan Ndéré"
                placeholderTextColor={Colors.muted}
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

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

            {/* Mot de passe */}
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
              {password.length > 0 && (
                <View style={styles.strengthWrap}>
                  <View style={[
                    styles.strengthBar,
                    {
                      backgroundColor:
                        password.length >= 8 ? Colors.low :
                          password.length >= 6 ? Colors.medium :
                            Colors.urgent,
                      width: `${Math.min((password.length / 10) * 100, 100)}%`,
                    },
                  ]} />
                  <Text style={styles.strengthText}>
                    {password.length >= 8 ? '💪 Fort' :
                      password.length >= 6 ? '⚡ Moyen' :
                        '⚠️ Faible'}
                  </Text>
                </View>
              )}
            </View>

            {/* Confirmer mot de passe */}
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>Confirmer le mot de passe</Text>
              <View style={styles.passwordWrap}>
                <TextInput
                  style={[
                    styles.input,
                    styles.passwordInput,
                    confirmPassword.length > 0 && {
                      borderColor: confirmPassword === password
                        ? Colors.low
                        : Colors.urgent,
                    },
                  ]}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.muted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowConfirm(!showConfirm)}
                >
                  <Text style={styles.eyeIcon}>{showConfirm ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
              {confirmPassword.length > 0 && (
                <Text style={[
                  styles.matchText,
                  { color: confirmPassword === password ? Colors.low : Colors.urgent },
                ]}>
                  {confirmPassword === password ? '✅ Les mots de passe correspondent' : '❌ Les mots de passe ne correspondent pas'}
                </Text>
              )}
            </View>

            {/* Bouton inscription */}
            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.bg} />
              ) : (
                <Text style={styles.btnText}>Créer mon compte</Text>
              )}
            </TouchableOpacity>

            {/* Séparateur */}
            <View style={styles.separator}>
              <View style={styles.separatorLine} />
              <Text style={styles.separatorText}>ou</Text>
              <View style={styles.separatorLine} />
            </View>

            {/* Lien connexion */}
            <TouchableOpacity
              style={styles.loginBtn}
              onPress={() => router.back()}
            >
              <Text style={styles.loginText}>
                Déjà un compte ?{' '}
                <Text style={styles.loginLink}>Se connecter</Text>
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
  logoWrap: { alignItems: 'center', marginBottom: 32 },
  logoBox: { width: 72, height: 72, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderCyan, alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowColor: Colors.cyan, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  logoEmoji: { fontSize: 36 },
  appName: { fontSize: 28, fontWeight: '800', color: Colors.text, letterSpacing: -0.5, marginBottom: 6 },
  tagline: { fontSize: 13, color: Colors.muted, fontStyle: 'italic', textAlign: 'center' },

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

  // Force mot de passe
  strengthWrap: { marginTop: 6, gap: 4 },
  strengthBar: { height: 3, borderRadius: 2, backgroundColor: Colors.urgent },
  strengthText: { fontSize: 10, color: Colors.muted },

  // Match confirmation
  matchText: { fontSize: 10, marginTop: 5, fontWeight: '600' },

  // Bouton
  btn: { backgroundColor: Colors.cyan, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8, shadowColor: Colors.cyan, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 6 },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: 15, fontWeight: '700', color: Colors.bg },

  // Séparateur
  separator: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 10 },
  separatorLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  separatorText: { fontSize: 12, color: Colors.muted },

  // Connexion
  loginBtn: { alignItems: 'center' },
  loginText: { fontSize: 13, color: Colors.muted },
  loginLink: { color: Colors.cyan, fontWeight: '700' },
})