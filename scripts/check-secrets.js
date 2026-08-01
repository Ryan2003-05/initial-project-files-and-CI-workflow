#!/usr/bin/env node
const requiredVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  'EXPO_TOKEN',
  'ANDROID_KEYSTORE_PASSWORD',
  'ANDROID_KEY_ALIAS',
  'ANDROID_KEY_PASSWORD',
]

const missing = requiredVars.filter((name) => !process.env[name])

if (missing.length > 0) {
  console.error('Missing required environment variables:')
  missing.forEach((name) => console.error(`  - ${name}`))
  console.error('\nSet these variables in CI secrets or a local .env file before running this script.')
  process.exit(1)
}

console.log('All required environment variables are present.')
process.exit(0)
