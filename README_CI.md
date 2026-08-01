# CI / Secrets (non-sensibles)

But: this file contains instructions only; do not store secret values here.

## Variables à définir dans le gestionnaire de secrets CI
- `EXPO_PUBLIC_SUPABASE_URL` (public)
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` (public)
- `SUPABASE_URL` (server)
- `SUPABASE_ANON_KEY` (server)
- `SUPABASE_SERVICE_ROLE_KEY` (server)
- `EAS_PROJECT_ID` (optionnel)
- `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` (pour la signature Android)

## Recommandations
- Définir ces valeurs dans GitHub Actions / GitLab CI / Bitrise / EAS secrets — ne jamais committer.
- Pour EAS, utilisez `eas secret:create` ou l'interface EAS pour stocker les clés qui serviront au build.
- Sur les runners CI, exportez les variables d'environnement avant d'exécuter le build.

## Commandes utiles
- Valider que les secrets requis sont présents :

```bash
npm run check-secrets
```

- Préparer la release (vérifier secrets, migrations, tests) :

```bash
npm run release:prepare
```

- Lancer un build EAS (exemple Android) :

```bash
npm run eas:build:android
```

## Notes
- Localement, tu peux copier `.env.example` en `.env` pour du développement, mais remplis seulement les variables non-sensibles.
- Si tu as besoin d'aide pour la configuration GitHub Actions / EAS, je peux générer un pipeline basique.
