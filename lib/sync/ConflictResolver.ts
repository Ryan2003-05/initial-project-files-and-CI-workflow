export function resolveConflict<T extends { updated_at: string }>(
  local: T,
  remote: T
): 'local' | 'remote' {
  const localTime = new Date(local.updated_at).getTime()
  const remoteTime = new Date(remote.updated_at).getTime()
  return localTime >= remoteTime ? 'local' : 'remote'
}