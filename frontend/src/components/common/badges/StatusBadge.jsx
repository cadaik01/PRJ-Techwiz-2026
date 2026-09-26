import PropTypes from 'prop-types';
import { cn } from '@/lib/cn';
import './StatusBadge.css';
const STATUS_META = {
    PLACED: { label: 'Placed', modifier: 'status-badge--placed' },
    ACCEPTED: { label: 'Accepted', modifier: 'status-badge--accepted' },
    READY_FOR_PICKUP: { label: 'Ready for pickup', modifier: 'status-badge--ready' },
    COMPLETED: { label: 'Completed', modifier: 'status-badge--completed' },
    DECLINED: { label: 'Declined', modifier: 'status-badge--declined' },
    CANCELLED: { label: 'Cancelled', modifier: 'status-badge--cancelled' },
    EXPIRED: { label: 'Expired', modifier: 'status-badge--expired' },
    NO_SHOW: { label: 'No-show', modifier: 'status-badge--noshow' },
};
export function StatusBadge({ status, className, }) {
    // A status added later (T14 brought NO_SHOW from ACCEPTED in v1.8) must not blank the order list.
    const meta = STATUS_META[status] ?? { label: status, modifier: 'status-badge--unknown' };
    return (<span className={cn('status-badge', meta.modifier, className)}>{meta.label}</span>);
}

StatusBadge.propTypes = {
    status: PropTypes.string.isRequired,
    className: PropTypes.string,
};
