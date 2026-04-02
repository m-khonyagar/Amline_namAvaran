import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { I18nProvider } from './contexts/I18nContext'
import { initOptionalSentry } from './lib/optionalSentry'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

async function enableMocking() {
  const useMsw =
    import.meta.env.DEV && import.meta.env.VITE_USE_MSW === 'true'
  if (useMsw) {
    const { worker } = await import('./mocks/browser')
    return worker.start({
      onUnhandledRequest: 'bypass',
    })
  }
}

enableMocking().then(() => {
  initOptionalSentry()
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </I18nProvider>
      </QueryClientProvider>
    </React.StrictMode>,
  )
})
