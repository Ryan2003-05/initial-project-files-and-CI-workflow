export const monitoring = {
  captureException: (error: unknown, context?: Record<string, unknown>) => {
    console.error('[Monitoring] Exception:', context ?? {}, error)
  },
  captureMessage: (message: string, context?: Record<string, unknown>) => {
    console.log('[Monitoring] Message:', message, context ?? {})
  },
}
