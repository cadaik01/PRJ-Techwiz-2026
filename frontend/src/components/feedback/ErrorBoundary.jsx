import { Component } from 'react';

import { Button } from '../ui/Button';

// A render error anywhere below this boundary would otherwise unmount the whole
// tree and leave a blank white page with no clue what happened.
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Something went wrong</h1>
        <p className="max-w-md text-sm text-slate-600">
          The page hit an unexpected error. Reloading usually clears it.
        </p>
        <Button onClick={() => window.location.reload()}>Reload page</Button>
      </div>
    );
  }
}
