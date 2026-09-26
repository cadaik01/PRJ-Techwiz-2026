import { Check, Circle, X } from 'lucide-react';

import { cn } from '@/lib/cn';

import './OrderTimeline.css';

const MAIN_STEPS = [
  { key: 'PLACED', label: 'Placed' },
  { key: 'ACCEPTED', label: 'Accepted' },
  { key: 'READY_FOR_PICKUP', label: 'Ready' },
  { key: 'COMPLETED', label: 'Completed' },
]         ;

const BRANCH                                                                    = {
  DECLINED: { label: 'Declined', tone: 'danger' },
  CANCELLED: { label: 'Cancelled', tone: 'danger' },
  EXPIRED: { label: 'Expired', tone: 'muted' },
  NO_SHOW: { label: 'No-show', tone: 'warning' },
};

function stepIndex(status             ) {
  if (status === 'COMPLETED') return 3;
  if (status === 'READY_FOR_PICKUP') return 2;
  if (status === 'ACCEPTED') return 1;
  if (status === 'PLACED') return 0;
  return -1;
}

function branchModifier(tone            ) {
  if (tone === 'danger') return 'order-timeline__branch--danger';
  if (tone === 'warning') return 'order-timeline__branch--warning';
  return 'order-timeline__branch--muted';
}

export function OrderTimeline({ status }                         ) {
  const branch = BRANCH[status];
  const active = stepIndex(status);

  return (
    <div className="order-timeline">
      <ol className="order-timeline__steps">
        {MAIN_STEPS.map((step, index) => {
          const done = active >= index && active >= 0;
          const current = active === index;
          return (
            <li
              key={step.key}
              className={cn(
                'order-timeline__step',
                done && 'is-done',
                current && status === 'READY_FOR_PICKUP' && 'is-pulse',
              )}
            >
              <div className="order-timeline__icon-wrap">
                {done ? (
                  <Check className="order-timeline__icon is-done" />
                ) : (
                  <Circle className="order-timeline__icon is-pending" />
                )}
              </div>
              <p className="order-timeline__label">{step.label}</p>
            </li>
          );
        })}
      </ol>
      {branch ? (
        <div className={cn('order-timeline__branch', branchModifier(branch.tone))}>
          <X className="order-timeline__branch-icon" />
          Ended: {branch.label}
        </div>
      ) : null}
    </div>
  );
}
