import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Editor Error Boundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.removeItem('be-autosave');
      localStorage.removeItem('be-title');
    } catch { /* ignore */ }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950 text-white">
          <div className="max-w-md w-full p-6 bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle size={30} />
            </div>
            <h2 className="text-xl font-bold text-white">Editor Recovered</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              A temporary render state issue was safely caught. Click below to clear stored state and restore your clean canvas instantly.
            </p>
            <div className="p-3 bg-slate-950 rounded-xl text-left font-mono text-[11px] text-amber-300/90 max-h-28 overflow-auto border border-slate-800">
              {this.state.error?.message || 'State render boundary safety trigger'}
            </div>
            <button
              onClick={this.handleReset}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold text-xs text-white flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer"
            >
              <RefreshCw size={15} />
              <span>Reset & Reload Canvas</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
