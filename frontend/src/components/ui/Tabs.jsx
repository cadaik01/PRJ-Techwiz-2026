import * as RadixTabs from '@radix-ui/react-tabs';

import { cn } from '../../lib/utils';

export function Tabs({ value, onValueChange, tabs = [], children, className }) {
  return (
    <RadixTabs.Root value={value} onValueChange={onValueChange} className={className}>
      <RadixTabs.List className="flex gap-1 border-b border-slate-200">
        {tabs.map((tab) => (
          <RadixTabs.Trigger
            key={tab.value}
            value={tab.value}
            className={cn(
              'px-4 py-2 text-sm font-medium text-slate-600 outline-none',
              'border-b-2 border-transparent -mb-px transition',
              'data-[state=active]:border-blue-600 data-[state=active]:text-blue-700',
            )}
          >
            {tab.label}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {children}
    </RadixTabs.Root>
  );
}

export const TabPanel = RadixTabs.Content;
