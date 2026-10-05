import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * Keeps a rendering error in one page from blanking the whole app.
 * Shows a friendly message with a reload button instead; `resetKey` (e.g. the route) clears it on navigation.
 */
export class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Page failed to render', error, info.componentStack);
  }

  componentDidUpdate(prev: { resetKey?: string }) {
    if (this.state.failed && prev.resetKey !== this.props.resetKey) this.setState({ failed: false });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section className="section" style={{ paddingTop: 180, textAlign: 'center' }}>
        <div className="wrap">
          <h2 style={{ fontSize: 28, fontWeight: 300 }}>This page didn’t load properly</h2>
          <p>A newer version of the website may be available. Reloading usually fixes it.</p>
          <button className="btn solid" onClick={() => window.location.reload()}>Reload page</button>
        </div>
      </section>
    );
  }
}
