import { PageHeader } from '@/components/common/layout/PageHeader';
import { Card, CardContent } from '@/components/common/cards/Card';
import { ChangePasswordForm } from '@/components/common/forms/ChangePasswordForm';

import './ChangePasswordPage.css';

export default function ChangePasswordPage() {
  return (
    <div>
      <PageHeader
        title="Change password"
        description="For your security, you will be asked to sign in again after saving."
      />
      <Card className="change-password-page__card">
        <CardContent className="change-password-page__content">
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
