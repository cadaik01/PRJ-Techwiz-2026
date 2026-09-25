import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';
import { ChangePasswordForm } from '@/features/auth/components/ChangePasswordForm';

import './ChangePasswordPage.css';

export default function ChangePasswordPage() {
  return (
    <div>
      <PageHeader
        title="Đổi mật khẩu"
        description="Sau khi đổi mật khẩu, bạn sẽ cần đăng nhập lại."
      />
      <Card className="change-password-page__card">
        <CardContent className="change-password-page__content">
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
