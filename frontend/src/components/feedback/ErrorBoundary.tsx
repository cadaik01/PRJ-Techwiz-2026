import { Component, type ErrorInfo, type ReactNode } from 'react';

import { Button } from '@/components/ui/Button';

import './ErrorBoundary.css';

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

/** Catches render errors in the React tree and shows a recovery UI. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error', error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h1 className="error-boundary__title">Đã xảy ra lỗi</h1>
          <p className="error-boundary__message">
            Giao diện gặp sự cố không mong muốn. Bạn có thể thử tải lại phần này.
          </p>
          <Button type="button" onClick={this.handleRetry}>
            Thử lại
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
