import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/Button';

import './ForbiddenPage.css';

export default function ForbiddenPage() {
  return (
    <div className="forbidden-page">
      <p className="forbidden-page__code">403</p>
      <h1 className="forbidden-page__title">Không có quyền truy cập</h1>
      <p className="forbidden-page__desc">Bạn không được phép vào trang này.</p>
      <Button asChild>
        <Link to="/">Về trang chủ</Link>
      </Button>
    </div>
  );
}
