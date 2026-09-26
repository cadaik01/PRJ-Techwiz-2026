import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { loginSchema } from '@/features/auth/schemas/auth.schemas';
import { ApiError } from '@/lib/ApiError';
import { mapServerErrorsToForm } from '@/utils/mapServerErrors';
import './LoginForm.css';

export function LoginForm() {
    const { login, loginPending, adminLogin, adminLoginPending } = useAuth();
    const pending = loginPending || adminLoginPending;
    const { register, handleSubmit, setError, formState: { errors }, } = useForm({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: '', password: '' },
    });
    const submitLogin = async (values) => {
        try {
            if (values.email.toLowerCase() === 'admin@demo.vn') {
                await adminLogin(values);
                return;
            }
            await login(values);
        }
        catch (error) {
            const apiError = ApiError.fromUnknown(error);
            mapServerErrorsToForm(apiError.fieldErrors, setError);
        }
    };
    return (<div className="login-form">
      <div>
        <p className="login-form__intro-eyebrow">Welcome back</p>
        <h1 className="login-form__title">Sign in to MarketLink</h1>
        <p className="login-form__subtitle">
          Pick up where you left off — browse stalls, reserve produce, and collect
          on your schedule.
        </p>
      </div>

      <form className="login-form__form" onSubmit={handleSubmit(async (values) => {
            await submitLogin(values);
        })}>
        <div className="login-form__field">
          <Input id="email" type="email" label="Email" autoComplete="email" {...register('email')}/>
          {errors.email ? (<p className="login-form__error">{errors.email.message}</p>) : null}
        </div>
        <div className="login-form__field">
          <Input id="password" type="password" label="Password" autoComplete="current-password" {...register('password')}/>
          {errors.password ? (<p className="login-form__error">{errors.password.message}</p>) : null}
        </div>
        <Button type="submit" size="lg" className="login-form__submit" loading={pending}>
          Sign in
        </Button>
      </form>

      <div className="login-form__footer">
        <p>New to MarketLink?</p>
        <div className="login-form__footer-links">
          <Link to="/register" className="login-form__footer-link">
            Shop as a customer
            <ArrowRight className="login-form__footer-link-icon"/>
          </Link>
          <span className="login-form__footer-sep" aria-hidden>
            |
          </span>
          <Link to="/register/farmer" className="login-form__footer-link">
            Sell as a farmer
            <ArrowRight className="login-form__footer-link-icon"/>
          </Link>
        </div>
      </div>
    </div>);
}
