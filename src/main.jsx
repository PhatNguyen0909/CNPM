import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import StoreContextProvider from './context/StoreContext.jsx'
// Register PWA service worker (vite-plugin-pwa)
import { registerSW } from 'virtual:pwa-register'

// Auto update prompt (silent). You can extend with a toast later.
registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <StoreContextProvider>
      <App />
    </StoreContextProvider>
  </BrowserRouter>
)
