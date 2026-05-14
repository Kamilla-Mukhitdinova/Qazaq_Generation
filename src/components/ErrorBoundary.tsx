import { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryState {
  error: Error | null;
}

export default class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Application render error:', error, info);
  }

  private reload = () => {
    window.location.reload();
  };

  private resetSession = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('qg-sidebar-collapsed');
    localStorage.removeItem('qg-sidebar-width');
    window.location.href = '/login';
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <section className="w-full max-w-xl rounded-lg border bg-card p-6 shadow-sm">
          <p className="text-sm font-medium text-destructive">Қолданбада қате пайда болды</p>
          <h1 className="mt-2 text-2xl font-semibold">Приложение упало при загрузке</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Это больше не белый экран: ниже показана ошибка, из-за которой React остановил рендер.
          </p>
          <pre className="mt-4 max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs text-muted-foreground">
            {this.state.error.message}
          </pre>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={this.reload}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Перезагрузить
            </button>
            <button
              type="button"
              onClick={this.resetSession}
              className="rounded-md border px-4 py-2 text-sm font-medium"
            >
              Очистить сессию
            </button>
          </div>
        </section>
      </main>
    );
  }
}
