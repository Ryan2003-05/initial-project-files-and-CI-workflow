# Checklist de release Play Store

## Préparation (avant build)
- [ ] Mettre à jour `app.json` : `android.package`, `version`, `versionCode`.
- [ ] Vérifier et ajouter uniquement les permissions nécessaires.
- [ ] S'assurer que les secrets CI sont configurés :
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Exécuter `npm run release:prepare` (exécute `check-secrets`, `migrate`, `test`).

## Sync et base de données
- [ ] Confirmer que `SyncEngine` pousse avant de tirer.
- [ ] Vérifier que les payloads `update` envoient l'objet complet.
- [ ] Tester workflow offline/online et retries (queue + `next_attempt`).
- [ ] Valider migrations SQLite et `PRAGMA user_version`.

## Tests et qualité
- [ ] Tous les tests unitaires et d'intégration passent.
- [ ] Aucune variable sensible committée.

## Build
- [ ] Générer build de production EAS : `npm run eas:build:android`.
- [ ] Tester le binaire sur un appareil réel.

## Publication
- [ ] Préparer les assets, description et screenshots.
- [ ] Remplir la fiche Play Store et uploader l'APK/AAB.
- [ ] Poster changelog et version.

---

Bonne chance pour la release !
