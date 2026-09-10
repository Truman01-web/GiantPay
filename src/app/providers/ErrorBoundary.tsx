import { Component, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface Props {
  children: ReactNode;
  /** Label shown in the fallback, e.g. "checkout" — kept generic so the
   * fallback never implies more than it knows. */
  boundaryName?: string;
}

interface State {
  hasError: boolean;
}

/** Application- and route-level error boundary. Renders a safe, human
 * fallback — never a raw stack trace — and lets the user recover without a
 * full reload where possible. */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: unknown) {
    // In a real deployment this reports to telemetry (services/telemetry).
    // Kept to console in this build since no monitoring DSN is configured.
    console.error('Unhandled UI error', error);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-6 text-center">
          <AlertTriangle className="h-8 w-8 text-[var(--color-red-600)]" aria-hidden="true" />
          <p className="text-[length:var(--text-h4)] font-semibold text-[var(--color-navy-900)]">
            Something went wrong{this.props.boundaryName ? ` in ${this.props.boundaryName}` : ''}
          </p>
          <p className="max-w-sm text-[length:var(--text-body)] text-[var(--color-neutral-600)]">
            Please try again. If this keeps happening, contact support.
          </p>
          <Button variant="secondary" onClick={() => this.setState({ hasError: false })}>
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
