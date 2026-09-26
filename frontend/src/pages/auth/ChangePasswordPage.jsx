import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';
import { ChangePasswordForm } from '@/features/auth/components/ChangePasswordForm';
import '@/styles/auth/ChangePasswordPage.css';
export default function ChangePasswordPage() {
    return (<div>
      <PageHeader title="Change password" description="For your security, you will be asked to sign in again after saving."/>
      <Card className="change-password-page__card">
        <CardContent className="change-password-page__content">
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>);
}

