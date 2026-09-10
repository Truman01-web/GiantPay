import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('renders a text label alongside the icon, not colour alone', () => {
    render(<StatusBadge status="SUCCEEDED" />);
    expect(screen.getByText('Succeeded')).toBeInTheDocument();
  });

  it('humanizes an unmapped status rather than rendering nothing', () => {
    render(<StatusBadge status="SOME_UNKNOWN_STATUS" />);
    expect(screen.getByText('SOME_UNKNOWN_STATUS')).toBeInTheDocument();
  });

  it('formats multi-word statuses with spaces', () => {
    render(<StatusBadge status="PARTIALLY_REFUNDED" />);
    expect(screen.getByText('Partially refunded')).toBeInTheDocument();
  });
});
