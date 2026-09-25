import type {
  Announcement,
  Category,
  DayOfWeek,
  FarmerPublic,
  FarmerSummary,
  Market,
  PickupOption,
  ProductCard,
  ProductDetail,
  Review,
} from '@/types';
import { productAvailability } from '@/types';

const IMG =
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80';
const PRODUCT_IMG =
  'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?auto=format&fit=crop&w=800&q=80';
const AVATAR =
  'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=200&q=80';

export const categories: Category[] = [
  { id: 1, name: 'Rau củ', icon: 'leaf', display_order: 1 },
  { id: 2, name: 'Trái cây', icon: 'apple', display_order: 2 },
  { id: 3, name: 'Bơ sữa', icon: 'milk', display_order: 3 },
  { id: 4, name: 'Thịt trứng', icon: 'egg', display_order: 4 },
  { id: 5, name: 'Gạo & ngũ cốc', icon: 'wheat', display_order: 5 },
  { id: 6, name: 'Gia vị', icon: 'flame', display_order: 6 },
];

export const markets: Market[] = [
  {
    id: 1,
    name: 'Chợ Bến Thành',
    address: 'Lê Lợi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh',
    latitude: 10.7725,
    longitude: 106.698,
    image: IMG,
    open_time: '06:00',
    close_time: '18:00',
    operating_days: [1, 2, 3, 4, 5, 6, 7],
    upcoming_closures: [],
    farmer_count: 3,
    distance_km: null,
    is_favorite: false,
    description: 'Chợ trung tâm Sài Gòn với nhiều quầy nông sản tươi.',
    map_provider: 'OSM',
  },
  {
    id: 2,
    name: 'Chợ Bình Tây',
    address: '57A Tháp Mười, Phường 2, Quận 6, TP. Hồ Chí Minh',
    latitude: 10.7503,
    longitude: 106.6519,
    image: IMG,
    open_time: '05:30',
    close_time: '17:30',
    operating_days: [1, 3, 5, 6],
    upcoming_closures: [],
    farmer_count: 2,
    distance_km: null,
    is_favorite: false,
    description: 'Chợ sỉ nổi tiếng phía Tây thành phố.',
    map_provider: 'OSM',
  },
  {
    id: 3,
    name: 'Chợ nông sản Thủ Đức',
    address: 'Võ Văn Ngân, Phường Linh Chiểu, TP. Thủ Đức, TP. Hồ Chí Minh',
    latitude: 10.8502,
    longitude: 106.7717,
    image: IMG,
    open_time: '05:00',
    close_time: '16:00',
    operating_days: [2, 4, 6, 7],
    upcoming_closures: [],
    farmer_count: 2,
    distance_km: null,
    is_favorite: false,
    description: 'Phiên chợ nông sản khu Đông.',
    map_provider: 'OSM',
  },
  {
    id: 4,
    name: 'Chợ Đà Lạt',
    address: 'Nguyễn Thị Minh Khai, Phường 1, Đà Lạt',
    latitude: 11.9404,
    longitude: 108.4583,
    image: IMG,
    open_time: '06:00',
    close_time: '18:00',
    operating_days: [1, 2, 3, 4, 5, 6, 7],
    upcoming_closures: [],
    farmer_count: 2,
    distance_km: null,
    is_favorite: false,
    description: 'Nguồn rau củ Đà Lạt tươi mới mỗi ngày.',
    map_provider: 'OSM',
  },
  {
    id: 5,
    name: 'Chợ Đông Ba',
    address: 'Trần Hưng Đạo, Phường Phú Hòa, Huế',
    latitude: 16.4691,
    longitude: 107.5955,
    image: IMG,
    open_time: '06:00',
    close_time: '17:00',
    operating_days: [1, 3, 5, 7],
    upcoming_closures: [],
    farmer_count: 1,
    distance_km: null,
    is_favorite: false,
    description: 'Chợ truyền thống Huế với đặc sản miền Trung.',
    map_provider: 'OSM',
  },
];

export type FarmerSeed = FarmerPublic & {
  favorite_count: number;
};

function farmerMarketsToPickupWindows(
  farmerId: number,
  marketRefs: Array<{
    market_id: number;
    market_name: string;
    stall_label: string;
    latitude: number;
    longitude: number;
    days: DayOfWeek[];
  }>,
): FarmerPublic['pickup_windows'] {
  return marketRefs.map((m, index) => ({
    farmer_market_id: farmerId * 100 + index + 1,
    market_id: m.market_id,
    market_name: m.market_name,
    stall_label: m.stall_label,
    latitude: m.latitude,
    longitude: m.longitude,
    slots: m.days.flatMap((day, dayIndex) => [
      {
        id: farmerId * 1000 + index * 10 + dayIndex * 2 + 1,
        day_of_week: day,
        start_time: '08:00',
        end_time: '09:00',
        is_active: true,
      },
      {
        id: farmerId * 1000 + index * 10 + dayIndex * 2 + 2,
        day_of_week: day,
        start_time: '09:00',
        end_time: '10:00',
        is_active: true,
      },
    ]),
  }));
}

export const farmers: FarmerSeed[] = [
  {
    id: 2,
    stall_name: 'Shop Rau Đà Lạt',
    image: AVATAR,
    rating_avg: 4.8,
    rating_count: 126,
    markets: [
      { market_id: 4, market_name: 'Chợ Đà Lạt', stall_label: 'Dãy A · Quầy 12' },
      { market_id: 1, market_name: 'Chợ Bến Thành', stall_label: 'Khu rau · Quầy 08' },
    ],
    operating_days: [1, 2, 3, 4, 5, 6, 7],
    in_stock_product_count: 6,
    upcoming_closures: [],
    distance_km: null,
    is_favorite: false,
    contact_person: 'Lan Hương',
    phone: '0912345678',
    address: 'Đà Lạt, Lâm Đồng',
    description: 'Gia đình trồng rau Đà Lạt hơn 15 năm. Cam kết không thuốc trừ sâu.',
    latitude: 11.941,
    longitude: 108.459,
    order_cutoff_hours: 12,
    pickup_windows: farmerMarketsToPickupWindows(2, [
      {
        market_id: 4,
        market_name: 'Chợ Đà Lạt',
        stall_label: 'Dãy A · Quầy 12',
        latitude: 11.941,
        longitude: 108.459,
        days: [1, 2, 3, 4, 5, 6, 7],
      },
      {
        market_id: 1,
        market_name: 'Chợ Bến Thành',
        stall_label: 'Khu rau · Quầy 08',
        latitude: 10.7728,
        longitude: 106.6982,
        days: [1, 2, 3, 4, 5, 6],
      },
    ]),
    favorite_count: 89,
  },
  {
    id: 101,
    stall_name: 'Shop Xoài',
    image: AVATAR,
    rating_avg: 4.9,
    rating_count: 210,
    markets: [
      {
        market_id: 2,
        market_name: 'Chợ Bình Tây',
        stall_label: 'Khu trái cây · Quầy 21',
      },
      {
        market_id: 3,
        market_name: 'Chợ nông sản Thủ Đức',
        stall_label: 'Dãy C · Quầy 03',
      },
    ],
    operating_days: [1, 3, 5, 6],
    in_stock_product_count: 4,
    upcoming_closures: [],
    distance_km: null,
    is_favorite: false,
    contact_person: 'Minh Tuấn',
    phone: '0909888777',
    address: 'Quận 6, TP. Hồ Chí Minh',
    description: 'Xoài cát Hòa Lộc chín cây, thu hoạch theo đơn đặt trước.',
    latitude: 10.7505,
    longitude: 106.652,
    order_cutoff_hours: 12,
    pickup_windows: farmerMarketsToPickupWindows(101, [
      {
        market_id: 2,
        market_name: 'Chợ Bình Tây',
        stall_label: 'Khu trái cây · Quầy 21',
        latitude: 10.7505,
        longitude: 106.652,
        days: [1, 3, 5, 6],
      },
      {
        market_id: 3,
        market_name: 'Chợ nông sản Thủ Đức',
        stall_label: 'Dãy C · Quầy 03',
        latitude: 10.8504,
        longitude: 106.7719,
        days: [2, 4, 6],
      },
    ]),
    favorite_count: 142,
  },
  {
    id: 102,
    stall_name: 'Shop Gà Ta',
    image: AVATAR,
    rating_avg: 4.6,
    rating_count: 78,
    markets: [
      { market_id: 1, market_name: 'Chợ Bến Thành', stall_label: 'Khu thịt · Quầy 15' },
    ],
    operating_days: [1, 2, 3, 4, 5, 6, 7],
    in_stock_product_count: 3,
    upcoming_closures: [],
    distance_km: null,
    is_favorite: false,
    contact_person: 'Thanh Hà',
    phone: '0933111222',
    address: 'Quận 1, TP. Hồ Chí Minh',
    description: 'Trứng gà ta thả vườn, thịt gà sạch.',
    latitude: 10.7726,
    longitude: 106.6981,
    order_cutoff_hours: 12,
    pickup_windows: farmerMarketsToPickupWindows(102, [
      {
        market_id: 1,
        market_name: 'Chợ Bến Thành',
        stall_label: 'Khu thịt · Quầy 15',
        latitude: 10.7726,
        longitude: 106.6981,
        days: [1, 2, 3, 4, 5, 6, 7],
      },
    ]),
    favorite_count: 54,
  },
  {
    id: 103,
    stall_name: 'Shop Sữa Tươi',
    image: AVATAR,
    rating_avg: 4.7,
    rating_count: 95,
    markets: [
      {
        market_id: 3,
        market_name: 'Chợ nông sản Thủ Đức',
        stall_label: 'Dãy Bơ sữa · Quầy 07',
      },
    ],
    operating_days: [2, 4, 6, 7],
    in_stock_product_count: 3,
    upcoming_closures: [],
    distance_km: null,
    is_favorite: false,
    contact_person: 'Quốc Bảo',
    phone: '0987654321',
    address: 'TP. Thủ Đức, TP. Hồ Chí Minh',
    description: 'Sữa tươi thanh trùng trong ngày từ trang trại Củ Chi.',
    latitude: 10.8503,
    longitude: 106.7718,
    order_cutoff_hours: 12,
    pickup_windows: farmerMarketsToPickupWindows(103, [
      {
        market_id: 3,
        market_name: 'Chợ nông sản Thủ Đức',
        stall_label: 'Dãy Bơ sữa · Quầy 07',
        latitude: 10.8503,
        longitude: 106.7718,
        days: [2, 4, 6, 7],
      },
    ]),
    favorite_count: 67,
  },
  {
    id: 104,
    stall_name: 'Shop Rau Sạch',
    image: AVATAR,
    rating_avg: 4.5,
    rating_count: 61,
    markets: [
      { market_id: 2, market_name: 'Chợ Bình Tây', stall_label: 'Khu rau · Quầy 05' },
      { market_id: 5, market_name: 'Chợ Đông Ba', stall_label: 'Quầy 18' },
    ],
    operating_days: [1, 3, 5, 7],
    in_stock_product_count: 5,
    upcoming_closures: [],
    distance_km: null,
    is_favorite: false,
    contact_person: 'Kim Anh',
    phone: '0977000111',
    address: 'Quận 6, TP. Hồ Chí Minh',
    description: 'Rau muống, cải xanh, rau thơm — cắt sáng, bán tại quầy chiều.',
    latitude: 10.7504,
    longitude: 106.6518,
    order_cutoff_hours: 12,
    pickup_windows: farmerMarketsToPickupWindows(104, [
      {
        market_id: 2,
        market_name: 'Chợ Bình Tây',
        stall_label: 'Khu rau · Quầy 05',
        latitude: 10.7504,
        longitude: 106.6518,
        days: [1, 3, 5, 6],
      },
      {
        market_id: 5,
        market_name: 'Chợ Đông Ba',
        stall_label: 'Quầy 18',
        latitude: 16.4692,
        longitude: 107.5956,
        days: [1, 3, 5, 7],
      },
    ]),
    favorite_count: 41,
  },
];

function product(
  partial: Omit<ProductDetail, 'availability' | 'is_favorite'> & {
    is_favorite?: boolean | null;
  },
): ProductDetail {
  return {
    ...partial,
    is_favorite: partial.is_favorite ?? false,
    availability: productAvailability(partial.stock_quantity, partial.is_available),
  };
}

export const products: ProductDetail[] = [
  product({
    id: 1,
    name: 'Rau muống sạch',
    image: PRODUCT_IMG,
    price: '0.48',
    unit: 'BUNCH',
    stock_quantity: 80,
    is_available: true,
    category: { id: 1, name: 'Rau củ' },
    farmer: { id: 104, stall_name: 'Shop Rau Sạch' },
    rating_avg: 4.6,
    rating_count: 42,
    description: 'Rau muống cắt sáng, không thuốc trừ sâu, bó khoảng 300g.',
    markets: [{ market_id: 2, market_name: 'Chợ Bình Tây', days: [1, 3, 5, 6] }],
  }),
  product({
    id: 2,
    name: 'Cà chua bi Đà Lạt',
    image: PRODUCT_IMG,
    price: '1.80',
    unit: 'KG',
    stock_quantity: 40,
    is_available: true,
    category: { id: 1, name: 'Rau củ' },
    farmer: { id: 2, stall_name: 'Shop Rau Đà Lạt' },
    rating_avg: 4.9,
    rating_count: 88,
    description: 'Cà chua bi ngọt, hái chín cây tại Đà Lạt.',
    markets: [
      { market_id: 1, market_name: 'Chợ Bến Thành', days: [1, 2, 3, 4, 5, 6] },
      { market_id: 4, market_name: 'Chợ Đà Lạt', days: [1, 2, 3, 4, 5, 6, 7] },
    ],
  }),
  product({
    id: 3,
    name: 'Cải thìa baby',
    image: PRODUCT_IMG,
    price: '0.72',
    unit: 'BUNCH',
    stock_quantity: 60,
    is_available: true,
    category: { id: 1, name: 'Rau củ' },
    farmer: { id: 2, stall_name: 'Shop Rau Đà Lạt' },
    rating_avg: 4.7,
    rating_count: 35,
    description: 'Cải thìa baby giòn ngọt, phù hợp xào hoặc nấu canh.',
    markets: [{ market_id: 4, market_name: 'Chợ Đà Lạt', days: [1, 2, 3, 4, 5, 6, 7] }],
  }),
  product({
    id: 4,
    name: 'Ớt chuông Đà Lạt',
    image: PRODUCT_IMG,
    price: '2.20',
    unit: 'KG',
    stock_quantity: 25,
    is_available: true,
    category: { id: 1, name: 'Rau củ' },
    farmer: { id: 2, stall_name: 'Shop Rau Đà Lạt' },
    rating_avg: 4.5,
    rating_count: 22,
    description: 'Ớt chuông đỏ/vàng/xanh, size đồng đều.',
    markets: [{ market_id: 1, market_name: 'Chợ Bến Thành', days: [1, 2, 3, 4, 5, 6] }],
  }),
  product({
    id: 5,
    name: 'Xà lách xoong',
    image: PRODUCT_IMG,
    price: '0.88',
    unit: 'BUNCH',
    stock_quantity: 35,
    is_available: true,
    category: { id: 1, name: 'Rau củ' },
    farmer: { id: 2, stall_name: 'Shop Rau Đà Lạt' },
    rating_avg: 4.4,
    rating_count: 18,
    description: 'Xà lách xoong tươi, giữ độ giòn khi bảo quản lạnh.',
    markets: [{ market_id: 4, market_name: 'Chợ Đà Lạt', days: [1, 2, 3, 4, 5, 6, 7] }],
  }),
  product({
    id: 6,
    name: 'Xoài cát Hòa Lộc',
    image: PRODUCT_IMG,
    price: '3.40',
    unit: 'KG',
    stock_quantity: 50,
    is_available: true,
    category: { id: 2, name: 'Trái cây' },
    farmer: { id: 101, stall_name: 'Shop Xoài' },
    rating_avg: 4.9,
    rating_count: 120,
    description: 'Xoài cát Hòa Lộc chín cây, ngọt đậm.',
    markets: [{ market_id: 2, market_name: 'Chợ Bình Tây', days: [1, 3, 5, 6] }],
  }),
  product({
    id: 7,
    name: 'Trứng gà ta',
    image: PRODUCT_IMG,
    price: '1.80',
    unit: 'PACK',
    stock_quantity: 30,
    is_available: true,
    category: { id: 4, name: 'Thịt trứng' },
    farmer: { id: 102, stall_name: 'Shop Gà Ta' },
    rating_avg: 4.8,
    rating_count: 64,
    description: 'Trứng gà ta thả vườn, lòng đỏ đậm.',
    markets: [
      { market_id: 1, market_name: 'Chợ Bến Thành', days: [1, 2, 3, 4, 5, 6, 7] },
    ],
  }),
  product({
    id: 8,
    name: 'Sữa tươi thanh trùng',
    image: PRODUCT_IMG,
    price: '1.28',
    unit: 'PIECE',
    stock_quantity: 45,
    is_available: true,
    category: { id: 3, name: 'Bơ sữa' },
    farmer: { id: 103, stall_name: 'Shop Sữa Tươi' },
    rating_avg: 4.6,
    rating_count: 51,
    description: 'Sữa tươi thanh trùng trong ngày.',
    markets: [{ market_id: 3, market_name: 'Chợ nông sản Thủ Đức', days: [2, 4, 6, 7] }],
  }),
];

function tomorrowDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function buildPickupDates(
  marketId: number,
  marketName: string,
  stallLabel: string,
  latitude: number,
  longitude: number,
  slotIdBase: number,
): PickupOption {
  const date = tomorrowDate();
  const day = ((new Date(date + 'T12:00:00').getDay() + 6) % 7) + 1;
  const day_of_week = day as DayOfWeek;
  return {
    market_id: marketId,
    market_name: marketName,
    stall_label: stallLabel,
    latitude,
    longitude,
    dates: [
      {
        date,
        day_of_week,
        slots: [
          {
            pickup_slot_id: slotIdBase,
            start_time: '08:00',
            end_time: '09:00',
            cutoff_at: new Date(Date.now() + 12 * 3600_000).toISOString(),
            is_bookable: true,
          },
          {
            pickup_slot_id: slotIdBase + 1,
            start_time: '09:00',
            end_time: '10:00',
            cutoff_at: new Date(Date.now() + 12 * 3600_000).toISOString(),
            is_bookable: true,
          },
        ],
      },
    ],
  };
}

export const pickupOptions: Record<number, PickupOption[]> = {
  2: [
    buildPickupDates(1, 'Chợ Bến Thành', 'Khu rau · Quầy 08', 10.7728, 106.6982, 10),
    buildPickupDates(4, 'Chợ Đà Lạt', 'Dãy A · Quầy 12', 11.941, 108.459, 20),
  ],
  101: [
    buildPickupDates(2, 'Chợ Bình Tây', 'Khu trái cây · Quầy 21', 10.7505, 106.652, 30),
  ],
  102: [
    buildPickupDates(1, 'Chợ Bến Thành', 'Khu thịt · Quầy 15', 10.7726, 106.6981, 40),
  ],
  103: [
    buildPickupDates(
      3,
      'Chợ nông sản Thủ Đức',
      'Dãy Bơ sữa · Quầy 07',
      10.8503,
      106.7718,
      50,
    ),
  ],
  104: [buildPickupDates(2, 'Chợ Bình Tây', 'Khu rau · Quầy 05', 10.7504, 106.6518, 60)],
};

export const reviews: Review[] = [
  {
    id: 1,
    type: 'FARMER',
    rating: 5,
    comment: 'Rau rất tươi, đúng như mô tả.',
    customer_display_name: 'Minh An',
    product: null,
    order_id: 4,
    reply: 'Cảm ơn bạn đã ủng hộ!',
    replied_at: '2026-09-12T15:00:00+07:00',
    is_hidden_by_admin: false,
    hidden_reason: null,
    created_at: '2026-09-12T10:00:00+07:00',
  },
  {
    id: 2,
    type: 'PRODUCT',
    rating: 4,
    comment: 'Cà chua ngọt, đóng gói cẩn thận.',
    customer_display_name: 'Thu Hà',
    product: { id: 2, name: 'Cà chua bi Đà Lạt' },
    order_id: 9,
    reply: null,
    replied_at: null,
    is_hidden_by_admin: false,
    hidden_reason: null,
    created_at: '2026-09-11T09:00:00+07:00',
  },
  {
    id: 3,
    type: 'FARMER',
    rating: 5,
    comment: 'Xoài ngon, chín vừa tới.',
    customer_display_name: 'Hoàng Nam',
    product: null,
    order_id: 2,
    reply: null,
    replied_at: null,
    is_hidden_by_admin: false,
    hidden_reason: null,
    created_at: '2026-09-10T11:00:00+07:00',
  },
];

export const announcements: Announcement[] = [
  {
    id: 1,
    title: 'Phiên chợ cuối tuần',
    content: 'Nhiều quầy rau củ Đà Lạt giảm giá 10% vào sáng Chủ nhật.',
    audience: 'ALL',
    starts_at: '2026-09-01T00:00:00+07:00',
    ends_at: null,
  },
  {
    id: 2,
    title: 'Nhắc lịch nhận hàng',
    content: 'Vui lòng đến đúng khung giờ đã đặt để tránh quá hạn.',
    audience: 'CUSTOMER',
    starts_at: '2026-09-05T00:00:00+07:00',
    ends_at: null,
  },
];

export function toFarmerSummary(f: FarmerSeed): FarmerSummary {
  return {
    id: f.id,
    stall_name: f.stall_name,
    image: f.image,
    rating_avg: f.rating_avg,
    rating_count: f.rating_count,
    markets: f.markets,
    operating_days: f.operating_days,
    in_stock_product_count: f.in_stock_product_count,
    upcoming_closures: f.upcoming_closures,
    distance_km: f.distance_km,
    is_favorite: f.is_favorite,
  };
}

export function toProductCard(p: ProductDetail): ProductCard {
  return {
    id: p.id,
    name: p.name,
    image: p.image,
    price: p.price,
    unit: p.unit,
    stock_quantity: p.stock_quantity,
    is_available: p.is_available,
    availability: p.availability,
    category: p.category,
    farmer: p.farmer,
    rating_avg: p.rating_avg,
    rating_count: p.rating_count,
    is_favorite: p.is_favorite,
  };
}
