import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider } from '@clerk/react'
import App from './App'
import './index.css'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined
const AUTH_DISABLED = import.meta.env.VITE_AUTH_DISABLED === 'true'

const useAuth = !AUTH_DISABLED && PUBLISHABLE_KEY && !PUBLISHABLE_KEY.includes('REPLACE')

const root = ReactDOM.createRoot(document.getElementById('root')!)

if (useAuth) {
  root.render(
    <React.StrictMode>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY!} afterSignOutUrl="/">
        <App />
      </ClerkProvider>
    </React.StrictMode>
  )
} else {
  root.render(
    <React.StrictMode>
      <App authDisabled />
    </React.StrictMode>
  )
}
