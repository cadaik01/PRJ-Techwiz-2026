import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StatusBadge } from '@/components/common/badges/StatusBadge';
import { PriceTag } from '@/components/common/cards/PriceTag';
import { Countdown } from '@/components/common/Countdown';
import { QuantityStepper } from '@/components/common/QuantityStepper';

/** OrderStatus, Pass 4B §3.4. Every value the API can send needs a badge. */
const ORDER_STATUSES = [
  ['PLACED', 'Placed'],
  ['ACCEPTED', 'Accepted'],
  ['READY_FOR_PICKUP', 'Ready for pickup'],
  ['COMPLETED', 'Completed'],
  ['CANCELLED', 'Cancelled'],
  ['DECLINED', 'Declined'],
  ['NO_SHOW', 'No-show'],
  ['EXPIRED', 'Expired'],
];

describe('StatusBadge', () => {
  it.each(ORDER_STATUSES)('%s reads as "%s"', (status, label) => {
    render(<StatusBadge status={status} />);

    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('survives a status it has never seen', () => {
    // v1.8 added T14; a future status must not blank the whole order list.
    render(<StatusBadge status="SOMETHING_NEW" />);

    expect(screen.getByText('SOMETHING_NEW')).toBeInTheDocument();
  });
});

describe('PriceTag', () => {
  it('shows a decimal string from the API as USD', () => {
    // Money arrives as a string such as "12.50" (A-016), never as a float.
    render(<PriceTag amount="12.50" />);

    expect(screen.getByText('$12.50')).toBeInTheDocument();
  });

  it('keeps the cents of an awkward amount', () => {
    render(<PriceTag amount="0.05" unit="KG" />);

    expect(screen.getByText('$0.05')).toBeInTheDocument();
    expect(screen.getByText('/KG')).toBeInTheDocument();
  });
});

describe('Countdown', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-09-26T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts the time left until the cutoff', () => {
    render(<Countdown targetIso="2026-09-26T12:30:45Z" label="Edit until" />);

    expect(screen.getByText('02:30:45 left')).toBeInTheDocument();
  });

  it('says so once the cutoff has passed', () => {
    render(<Countdown targetIso="2026-09-26T09:59:00Z" label="Edit until" />);

    expect(screen.getByText('Expired')).toBeInTheDocument();
  });

  it('ticks down on its own', () => {
    render(<Countdown targetIso="2026-09-26T10:00:10Z" label="Edit until" />);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByText('00:00:05 left')).toBeInTheDocument();
  });
});

describe('QuantityStepper', () => {
  it('will not go past the stock left', async () => {
    // C-01 caps the stepper at the stock fetched when the cart page opened.
    const onChange = vi.fn();
    render(<QuantityStepper value={3} max={3} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: /increase/i }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('will not go below one', async () => {
    const onChange = vi.fn();
    render(<QuantityStepper value={1} max={10} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: /decrease/i }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('reports each step', async () => {
    const onChange = vi.fn();
    render(<QuantityStepper value={2} max={10} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: /increase/i }));

    expect(onChange).toHaveBeenCalledWith(3);
  });
});
