import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[React ErrorBoundary caught error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          fontFamily: 'system-ui, sans-serif',
          background: '#0B2A5B',
          color: '#FFFFFF',
          textAlign: 'center'
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            padding: '2.5rem',
            borderRadius: '20px',
            maxWidth: '600px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
          }}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: '#FF7A1A' }}>
              VASTRA AI Mirror - Display Reset
            </h2>
            <p style={{ marginBottom: '1.5rem', opacity: 0.9 }}>
              {this.state.error?.message || 'A display glitch occurred. Click below to reload the live mirror.'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              style={{
                background: '#FF7A1A',
                color: '#FFF',
                border: 'none',
                padding: '0.8rem 2rem',
                borderRadius: '50px',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Reload Live Mirror
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
