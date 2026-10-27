import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './index.css'
import { initPwa } from './state/pwa'

initPwa()

// Tylko w trybie deweloperskim: dostęp do bazy z konsoli (testy E2E)
if (import.meta.env.DEV) void import('./db/db').then(({ db }) => Object.assign(window, { __db: db }))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
