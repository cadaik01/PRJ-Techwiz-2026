import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import {
  registerCustomerSchema,
  registerFarmerSchema,
  type RegisterCustomerValues,
  type RegisterFarmerValues,
} from '@/features/auth/schemas/auth.schemas';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ApiError } from '@/lib/ApiError';
import { cn } from '@/lib/cn';
import { mapServerErrorsToForm } from '@/utils/mapServerErrors';

import './RegisterForms.css';

function passwordStrength(password: string): { score: number; label: string } {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  const labels = ['Yếu', 'Trung bình', 'Khá', 'Mạnh'];
  return { score, label: labels[Math.max(0, score - 1)] ?? 'Yếu' };
}

function strengthBarModifier(score: number) {
  if (score <= 1) return 'password-strength__bar--weak';
  if (score === 2) return 'password-strength__bar--fair';
  if (score === 3) return 'password-strength__bar--good';
  return 'password-strength__bar--strong';
}

function PasswordStrengthMeter({ password }: { password: string }) {
  const strength = passwordStrength(password);

  return (
    <div className="password-strength">
      <div className="password-strength__track">
        <div
          className={cn('password-strength__bar', strengthBarModifier(strength.score))}
        />
      </div>
      <p className="password-strength__label">Độ mạnh: {strength.label}</p>
    </div>
  );
}

function AuthFooter({
  prompt,
  linkTo,
  linkLabel,
}: {
  prompt: string;
  linkTo: string;
  linkLabel: string;
}) {
  return (
    <p className="register-form__footer">
      {prompt}{' '}
      <Link to={linkTo} className="register-form__footer-link">
        {linkLabel}
      </Link>
    </p>
  );
}

export function RegisterCustomerForm() {
  const { registerCustomer, registerCustomerPending } = useAuth();
  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<RegisterCustomerValues>({
    resolver: zodResolver(registerCustomerSchema),
  });
  const password = watch('password') ?? '';

  return (
    <div className="register-form">
      <div>
        <p className="register-form__intro-eyebrow">Tài khoản khách hàng</p>
        <h1 className="register-form__title">Tạo tài khoản</h1>
        <p className="register-form__subtitle">
          Đặt trước nông sản và nhận tại quầy trong vài phút.
        </p>
        <Link to="/register/farmer" className="register-form__alt-link">
          Bạn là nông dân? Đăng ký quầy
          <ArrowRight className="register-form__alt-link-icon" />
        </Link>
      </div>

      <form
        className="register-form__form"
        onSubmit={handleSubmit(async (values) => {
          try {
            await registerCustomer(values);
          } catch (error) {
            mapServerErrorsToForm(ApiError.fromUnknown(error).fieldErrors, setError);
          }
        })}
      >
        <div className="register-form__field">
          <Label htmlFor="full_name">Họ và tên</Label>
          <Input
            id="full_name"
            className="register-form__input"
            {...register('full_name')}
          />
          {errors.full_name ? (
            <p className="register-form__error">{errors.full_name.message}</p>
          ) : null}
        </div>
        <div className="register-form__field">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            className="register-form__input"
            {...register('email')}
          />
          {errors.email ? (
            <p className="register-form__error">{errors.email.message}</p>
          ) : null}
        </div>
        <div className="register-form__field">
          <Label htmlFor="phone">Số điện thoại</Label>
          <Input
            id="phone"
            className="register-form__input"
            {...register('phone')}
            placeholder="09xxxxxxxx"
          />
          {errors.phone ? (
            <p className="register-form__error">{errors.phone.message}</p>
          ) : null}
        </div>
        <div className="register-form__field">
          <Label htmlFor="address">Địa chỉ</Label>
          <Input id="address" className="register-form__input" {...register('address')} />
          {errors.address ? (
            <p className="register-form__error">{errors.address.message}</p>
          ) : null}
        </div>
        <div className="register-form__field">
          <Label htmlFor="password">Mật khẩu</Label>
          <Input
            id="password"
            type="password"
            className="register-form__input"
            {...register('password')}
          />
          <PasswordStrengthMeter password={password} />
          {errors.password ? (
            <p className="register-form__error">{errors.password.message}</p>
          ) : null}
        </div>
        <div className="register-form__field">
          <Label htmlFor="confirm_password">Xác nhận mật khẩu</Label>
          <Input
            id="confirm_password"
            type="password"
            className="register-form__input"
            {...register('confirm_password')}
          />
          {errors.confirm_password ? (
            <p className="register-form__error">{errors.confirm_password.message}</p>
          ) : null}
        </div>
        <Button
          type="submit"
          size="lg"
          className="register-form__submit"
          loading={registerCustomerPending}
        >
          Tạo tài khoản
        </Button>
      </form>

      <AuthFooter prompt="Đã có tài khoản?" linkTo="/login" linkLabel="Đăng nhập" />
    </div>
  );
}

export function RegisterFarmerForm() {
  const { registerFarmer, registerFarmerPending } = useAuth();
  const [step, setStep] = useState(1);
  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setError,
    formState: { errors },
  } = useForm<RegisterFarmerValues>({
    resolver: zodResolver(registerFarmerSchema),
  });
  const password = watch('password') ?? '';

  return (
    <div className="register-form">
      <div>
        <p className="register-form__intro-eyebrow">Tài khoản nông dân</p>
        <h1 className="register-form__title">Đăng ký quầy</h1>
        <p className="register-form__subtitle">
          Hồ sơ sẽ chờ quản trị duyệt trước khi bán trên MarketLink.
        </p>
        <Link to="/register" className="register-form__alt-link">
          Đăng ký khách hàng thay thế
          <ArrowRight className="register-form__alt-link-icon" />
        </Link>
      </div>

      <div className="register-form__steps">
        <div className="register-form__steps-meta">
          <span>Bước {step}/2</span>
          <span>{step === 1 ? 'Thông tin tài khoản' : 'Thông tin quầy'}</span>
        </div>
        <div className="register-form__steps-bars">
          <div className={cn('register-form__steps-bar', step >= 1 && 'is-active')} />
          <div className={cn('register-form__steps-bar', step >= 2 && 'is-active')} />
        </div>
      </div>

      <form
        className="register-form__form"
        onSubmit={handleSubmit(async (values) => {
          try {
            await registerFarmer(values);
          } catch (error) {
            mapServerErrorsToForm(ApiError.fromUnknown(error).fieldErrors, setError);
          }
        })}
      >
        {step === 1 ? (
          <>
            <div className="register-form__field">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                className="register-form__input"
                {...register('email')}
              />
              {errors.email ? (
                <p className="register-form__error">{errors.email.message}</p>
              ) : null}
            </div>
            <div className="register-form__field">
              <Label htmlFor="phone">Số điện thoại</Label>
              <Input id="phone" className="register-form__input" {...register('phone')} />
              {errors.phone ? (
                <p className="register-form__error">{errors.phone.message}</p>
              ) : null}
            </div>
            <div className="register-form__field">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input
                id="password"
                type="password"
                className="register-form__input"
                {...register('password')}
              />
              <PasswordStrengthMeter password={password} />
              {errors.password ? (
                <p className="register-form__error">{errors.password.message}</p>
              ) : null}
            </div>
            <div className="register-form__field">
              <Label htmlFor="confirm_password">Xác nhận mật khẩu</Label>
              <Input
                id="confirm_password"
                type="password"
                className="register-form__input"
                {...register('confirm_password')}
              />
              {errors.confirm_password ? (
                <p className="register-form__error">{errors.confirm_password.message}</p>
              ) : null}
            </div>
            <Button
              type="button"
              size="lg"
              className="register-form__submit"
              onClick={async () => {
                const ok = await trigger([
                  'email',
                  'phone',
                  'password',
                  'confirm_password',
                ]);
                if (ok) setStep(2);
              }}
            >
              Tiếp tục
              <ArrowRight className="register-form__continue-icon" />
            </Button>
          </>
        ) : (
          <>
            <div className="register-form__field">
              <Label htmlFor="stall_name">Tên quầy</Label>
              <Input
                id="stall_name"
                className="register-form__input"
                {...register('stall_name')}
              />
              {errors.stall_name ? (
                <p className="register-form__error">{errors.stall_name.message}</p>
              ) : null}
            </div>
            <div className="register-form__field">
              <Label htmlFor="contact_person">Người liên hệ</Label>
              <Input
                id="contact_person"
                className="register-form__input"
                {...register('contact_person')}
              />
              {errors.contact_person ? (
                <p className="register-form__error">{errors.contact_person.message}</p>
              ) : null}
            </div>
            <div className="register-form__field">
              <Label htmlFor="address">Địa chỉ</Label>
              <Input
                id="address"
                className="register-form__input"
                {...register('address')}
              />
              {errors.address ? (
                <p className="register-form__error">{errors.address.message}</p>
              ) : null}
            </div>
            <div className="register-form__submit-row">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="register-form__submit"
                onClick={() => setStep(1)}
              >
                Quay lại
              </Button>
              <Button
                type="submit"
                size="lg"
                className="register-form__submit"
                loading={registerFarmerPending}
              >
                Gửi hồ sơ
              </Button>
            </div>
          </>
        )}
      </form>

      <AuthFooter prompt="Đã có tài khoản?" linkTo="/login" linkLabel="Đăng nhập" />
    </div>
  );
}
