'use client'

/**
 * useAuth — thin re-export of the shared AuthContext.
 *
 * All 9+ components that call useAuth() now read from a single AuthProvider
 * mounted at the (main) layout level instead of each running their own
 * getSession() + onAuthStateChange listener.
 */
export { useAuthContext as useAuth } from '../context/AuthContext'
