Sécurisation des clés Supabase

Objectif
- Retirer les clés Supabase du code source et les stocker dans des secrets EAS / variables d'environnement.

Étapes recommandées
1) Révoquer la clé exposée (optionnel mais recommandé)
   - Connecte-toi au dashboard Supabase → Project → Settings → API → Regenerate ANON key.
   - Note la nouvelle clé.

2) Définir les secrets EAS (recommandé pour builds EAS)
   - Installer EAS CLI si nécessaire : `npm install -g eas-cli`
   - Se connecter : `eas login`
   - Ajouter les secrets :
     ```bash
     eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://your.supabase.co"
     eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-anon-key"
     ```
   - Ces secrets seront disponibles pour les builds EAS.

3) Variables pour développement local
   - Créer un fichier `.env` (NE PAS COMMITTER) avec :
     ```env
     EXPO_PUBLIC_SUPABASE_URL=https://your.supabase.co
     EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
     ```
   - Utiliser un outil comme `react-native-dotenv` ou config loader pour charger ces variables en dev.

4) CI / Container
   - Dans ton CI (GitHub Actions, GitLab CI), définir `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_ANON_KEY` dans les settings de secrets de repo ou via la configuration du runner.

Notes
- Ne jamais committer les valeurs réelles dans le repo.
- Après avoir changé la clé, invalide les sessions si nécessaire depuis Supabase Dashboard.
- Vérifie que `lib/supabase.ts` lit bien ces variables (déjà mis à jour).

Commandes utiles
- Vérifier la variable localement avant build :
  ```bash
  node -e "console.log(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? 'KEY_SET' : 'NO_KEY')"
  ```

- Exécuter migrations localement : `npm run migrate`

Si tu veux, je peux ajouter un petit check startup qui échoue en CI si les variables ne sont pas définies, ou générer un script `scripts/check-secrets.js`.
