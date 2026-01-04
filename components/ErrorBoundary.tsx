import React, { ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-6 text-center font-sans">
          <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-full mb-4 shadow-sm">
            <AlertTriangle size={48} className="text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            Something went wrong
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-xs mx-auto">
            The application encountered an unexpected error. Please try reloading.
          </p>
          {this.state.error && (
             <div className="w-full max-w-sm bg-gray-100 dark:bg-gray-800 p-3 rounded-lg mb-6 overflow-auto text-left border border-gray-200 dark:border-gray-700">
                 <p className="text-xs font-mono text-red-600 dark:text-red-400 break-words">
                    {this.state.error.toString()}
                 </p>
             </div>
          )}
          <button
            onClick={() => window.location.reload()}
            className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-lg active:scale-95"
          >
            <RotateCw size={20} className="mr-2" />
            Reload App
          </button>
        </div>
      );
    }

    return (this as any).props.children;
  }
}