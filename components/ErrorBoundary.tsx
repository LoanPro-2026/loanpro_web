'use client';

import React, { ReactNode, ReactElement } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component to catch React errors
 * Prevents entire app from crashing on component errors
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error);
    console.error('Error Info:', errorInfo);

    // Log to error tracking service (e.g., Sentry, LogRocket)
    // Example: Sentry.captureException(error);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
              <div className="text-center">
                {/* Error Icon */}
                <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-4">
                  <svg
                    className="w-6 h-6 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4v2m0 4v2m0-12a9 9 0 110-18 9 9 0 010 18z"
                    />
                  </svg>
                </div>

                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  Oops! Something went wrong
                </h2>

                <p className="text-gray-600 mb-4">
                  We encountered an unexpected error. Please try again or contact support if the problem persists.
                </p>

                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-left overflow-auto max-h-40">
                    <summary className="cursor-pointer font-semibold text-red-700 mb-2">
                      Error Details (Dev Only)
                    </summary>
                    <code className="text-xs text-red-600 whitespace-pre-wrap break-words">
                      {this.state.error.toString()}
                    </code>
                  </details>
                )}

                <div className="mt-6 space-y-2">
                  <button
                    onClick={this.handleReset}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-2 px-4 rounded-lg hover:shadow-lg transition-all"
                  >
                    Try Again
                  </button>

                  <button
                    onClick={() => (window.location.href = '/')}
                    className="w-full bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition-all"
                  >
                    Go Home
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      );
    }

    return <>{this.props.children}</>;
  }
}
