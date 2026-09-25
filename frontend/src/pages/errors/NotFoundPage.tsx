import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/Button';

import './NotFoundPage.css';

export default function NotFoundPage() {
  return (
    <div className="not-found-page">
      <p className="not-found-page__code">404</p>
      <h1 className="not-found-page__title">Không tìm thấy trang</h1>
      <p className="not-found-page__desc">
        Đường dẫn không tồn tại hoặc đã bị di chuyển.
      </p>
      <Button asChild>
        <Link to="/">Về trang chủ</Link>
      </Button>
    </div>
  );
}
