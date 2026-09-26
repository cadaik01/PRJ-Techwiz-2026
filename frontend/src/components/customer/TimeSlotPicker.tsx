import { DAY_OF_WEEK_LABELS } from '@/utils/helpers/geo';
import type { PickupOption } from '@/types';
import { cn } from '@/lib/cn';

import './TimeSlotPicker.css';

export type SelectedSlot = {
  market_id: number;
  pickup_slot_id: number;
  pickup_date: string;
  label: string;
};

export function TimeSlotPicker({
  options,
  value,
  onChange,
  className,
}: {
  options: PickupOption[];
  value: SelectedSlot | null;
  onChange: (value: SelectedSlot) => void;
  /** Kept for API compatibility; dates come from PickupOption.dates */
  horizonDays?: number;
  className?: string;
}) {
  return (
    <div className={cn('time-slot-picker', className)}>
      {options.map((option) => (
        <div key={option.market_id} className="time-slot-picker__market">
          <div className="time-slot-picker__market-head">
            <p className="time-slot-picker__market-name">{option.market_name}</p>
            <p className="time-slot-picker__stall">{option.stall_label}</p>
          </div>
          <div className="time-slot-picker__dates">
            {option.dates.map((dateOption) => (
              <div key={dateOption.date}>
                <p className="time-slot-picker__date-label">
                  {DAY_OF_WEEK_LABELS[dateOption.day_of_week]} · {dateOption.date}
                </p>
                <div className="time-slot-picker__slots">
                  {dateOption.slots.map((slot) => {
                    const selected =
                      value?.market_id === option.market_id &&
                      value.pickup_slot_id === slot.pickup_slot_id &&
                      value.pickup_date === dateOption.date;
                    const label = `${option.market_name} · ${DAY_OF_WEEK_LABELS[dateOption.day_of_week]} ${dateOption.date} ${slot.start_time}-${slot.end_time}`;
                    return (
                      <button
                        key={slot.pickup_slot_id}
                        type="button"
                        disabled={!slot.is_bookable}
                        className={cn(
                          'time-slot-picker__slot',
                          selected && 'is-selected',
                        )}
                        onClick={() =>
                          onChange({
                            market_id: option.market_id,
                            pickup_slot_id: slot.pickup_slot_id,
                            pickup_date: dateOption.date,
                            label,
                          })
                        }
                      >
                        {slot.start_time}–{slot.end_time}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
