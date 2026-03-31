import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class WizardErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  handleReload = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          className="flex flex-col items-center justify-center min-h-[300px] gap-4 p-6 text-center"
          role="alert"
        >
          <span className="text-4xl">⚠️</span>
          <h2 className="text-lg font-bold text-gray-800">خطای غیرمنتظره</h2>
          <p className="text-sm text-gray-500 max-w-sm">
            مشکلی در نمایش این بخش رخ داد. اطلاعات شما ذخیره شده است.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="bg-primary text-white rounded-lg px-6 py-2 font-medium"
          >
            بارگذاری مجدد
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
