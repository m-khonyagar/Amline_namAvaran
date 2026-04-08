import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './auth/AuthProvider'
import { initPosthog } from './lib/posthog'
import './index.css'

initPosthog()

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
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
        {import.meta.env.DEV ? (
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
        ) : null}
      </QueryClientProvider>
    </React.StrictMode>,
  )
})
