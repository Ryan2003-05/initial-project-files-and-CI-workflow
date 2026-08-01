// Lightweight local id generator to avoid ESM issues in test environment
export function generateLocalId(): string {
  const a = Date.now().toString(36)
  const b = Math.random().toString(36).slice(2, 9)
  return `local-${a}-${b}`
}