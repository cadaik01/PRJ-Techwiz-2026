import * as React from 'react';
import { cn } from '@/lib/cn';
import './Badge.css';

export function Badge({ className, variant = 'default', ...props }) {
    return <div className={cn('badge', `badge--${variant}`, className)} {...props}/>;
}
