import { AlertTriangle, Ban, Clock } from 'lucide-react';
import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/Badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/Tooltip';
import type { FarmerStatus } from '@/types';
import { cn } from '@/lib/cn';

import './FarmerStatusGate.css';

type FarmerStatusGateProps = {
  status: FarmerStatus | null | undefined;
  rejectionReason?: string | null;
  children: ReactNode;
  className?: string;
};

export function FarmerStatusGate({
  status,
  rejectionReason,
  children,
  className,
}: FarmerStatusGateProps) {
  const isWriteLocked =
    status === 'PENDING' || status === 'REJECTED' || status === 'SUSPENDED';

  return (
    <div className={cn('farmer-status-gate', className)}>
      {status === 'PENDING' ? (
        <div className="farmer-status-gate__alert farmer-status-gate__alert--pending">
          <Clock className="farmer-status-gate__icon" />
          <div>
            <p className="farmer-status-gate__title">Hồ sơ đang chờ duyệt</p>
            <p className="farmer-status-gate__desc">
              Bạn có thể xem dữ liệu nhưng chưa thể tạo hoặc sửa sản phẩm.
            </p>
          </div>
          <Badge variant="warning">Chờ duyệt</Badge>
        </div>
      ) : null}

      {status === 'REJECTED' ? (
        <div className="farmer-status-gate__alert farmer-status-gate__alert--danger">
          <AlertTriangle className="farmer-status-gate__icon" />
          <div>
            <p className="farmer-status-gate__title">Hồ sơ bị từ chối</p>
            <p className="farmer-status-gate__desc">
              {rejectionReason || 'Vui lòng cập nhật hồ sơ và gửi lại.'}
            </p>
          </div>
        </div>
      ) : null}

      {status === 'SUSPENDED' ? (
        <div className="farmer-status-gate__alert farmer-status-gate__alert--danger">
          <Ban className="farmer-status-gate__icon" />
          <div>
            <p className="farmer-status-gate__title">Tài khoản tạm khóa</p>
            <p className="farmer-status-gate__desc">
              Các thao tác ghi bị vô hiệu. Bạn vẫn xem được dữ liệu hiện có.
            </p>
          </div>
        </div>
      ) : null}

      <TooltipProvider>
        <div
          className={cn(
            'farmer-status-gate__content',
            isWriteLocked && 'is-write-locked',
          )}
        >
          {isWriteLocked ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div>{children}</div>
              </TooltipTrigger>
              <TooltipContent>
                Không thể thực hiện khi hồ sơ{' '}
                {status === 'PENDING'
                  ? 'chờ duyệt'
                  : status === 'REJECTED'
                    ? 'bị từ chối'
                    : 'bị tạm khóa'}
              </TooltipContent>
            </Tooltip>
          ) : (
            children
          )}
        </div>
      </TooltipProvider>
    </div>
  );
}
