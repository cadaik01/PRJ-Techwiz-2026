import { Label } from '@/components/common/forms/Label';

import './SortSelect.css';

/** Sorting for the lists drawn as cards rather than tables, where there is no column header
 *  to click. Sends the same `ordering` values the tables do. */
export function SortSelect({
  id,
  options,
  value,
  onChange,
}

 ) {
  return (
    <div className="sort-select">
      <Label className="page-primitive__label-xs" htmlFor={id}>
        Sort by
      </Label>
      <select
        id={id}
        className="page-primitive__select"
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value || undefined)}
      >
        <option value="">Default</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
