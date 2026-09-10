import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AmountDisplay } from './AmountDisplay';

describe('AmountDisplay', () => {
  it('renders a formatted amount with tabular numerals', () => {
    render(<AmountDisplay amountMinor={4550000} currency="MWK" />);
    const el = screen.getByText(/45,500\.00/);
    expect(el).toHaveClass('tabular-nums');
  });

  it('never renders a raw minor-unit integer', () => {
    render(<AmountDisplay amountMinor={100} currency="MWK" />);
    expect(screen.queryByText('100')).not.toBeInTheDocument();
  });
});
