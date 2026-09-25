import { toast } from 'sonner';

import { useGeoStore } from '@/stores/geo.store';

export function useGeolocation() {
  const setCoords = useGeoStore((s) => s.setCoords);
  const lat = useGeoStore((s) => s.latitude);
  const lng = useGeoStore((s) => s.longitude);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Trình duyệt không hỗ trợ định vị');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords(pos.coords.latitude, pos.coords.longitude);
        toast.success('Đã lấy vị trí của bạn');
      },
      () => {
        toast.error('Không lấy được vị trí. Hãy cho phép truy cập vị trí.');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return { lat, lng, requestLocation };
}
