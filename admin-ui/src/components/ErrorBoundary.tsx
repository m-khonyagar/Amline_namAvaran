import { Component, type ErrorInfo, type ReactNode } from 'react'
import * as Sentry from '@sentry/react'

type Props = { children: ReactNode; fallbackTitle?: string }

type State = { hasError: boolean; message: string }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err.message || 'خطای ناشناخته' }
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error('ErrorBoundary:', err, info.componentStack)
    Sentry.captureException(err, { extra: { componentStack: info.componentStack } })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          role="alert"
          className="mx-auto max-w-xl rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/50 dark:bg-red-950/40"
        >
          <h2 className="text-lg font-semibold text-red-800 dark:text-red-200">
            {this.props.fallbackTitle ?? 'مشکلی در نمایش این بخش پیش آمد'}
          </h2>
          <p className="mt-2 break-all text-sm text-red-700/90 dark:text-red-300/90">{this.state.message}</p>
          <button
            type="button"
            className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800"
            onClick={() => this.setState({ hasError: false, message: '' })}
          >
            تلاش دوباره
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
