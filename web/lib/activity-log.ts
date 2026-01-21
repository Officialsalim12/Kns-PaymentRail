// Re-export types and interfaces from client file
export type { ActivityAction, ActivityLogData } from './activity-log-client'

// Re-export client function
export { logActivityClient } from './activity-log-client'

// NOTE: Server functions (logActivity, getUserInfoForLogging) should be imported directly from './activity-log-server'
// Do not re-export them here to avoid Next.js analyzing server-side code when this file is imported by client components
