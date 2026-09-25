import { Link, useNavigate } from 'react-router-dom';

import { useFavoriteDetails } from '@/features/customer/hooks/useFavorites';
import { EmptyState } from '@/components/feedback/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { FarmerCard } from '@/features/catalog/components/FarmerCard';
import { MarketCard } from '@/features/catalog/components/MarketCard';
import { ProductCardView } from '@/features/catalog/components/ProductCardView';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Skeleton } from '@/components/ui/Skeleton';

import './FavoritesPage.css';

export default function FavoritesPage() {
  const navigate = useNavigate();
  const {
    marketIds,
    farmerIds,
    productIds,
    markets,
    farmers,
    products,
    farmersLoading,
    productsLoading,
  } = useFavoriteDetails();

  return (
    <div className="favorites-page">
      <PageHeader title="Yêu thích" description="Nông dân, sản phẩm và chợ bạn đã lưu." />
      <Tabs defaultValue="farmers">
        <TabsList>
          <TabsTrigger value="farmers">Nông dân ({farmerIds.length})</TabsTrigger>
          <TabsTrigger value="products">Sản phẩm ({productIds.length})</TabsTrigger>
          <TabsTrigger value="markets">Chợ ({marketIds.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="farmers" className="favorites-page__stack">
          {farmerIds.length === 0 ? (
            <EmptyState
              title="Chưa có nông dân yêu thích"
              actionLabel="Khám phá quầy"
              onAction={() => navigate('/farmers')}
            />
          ) : farmersLoading ? (
            <Skeleton className="favorites-page__skeleton-card" />
          ) : (
            farmers.map((f) => (f ? <FarmerCard key={f.id} farmer={f} /> : null))
          )}
        </TabsContent>

        <TabsContent value="products">
          {productIds.length === 0 ? (
            <EmptyState title="Chưa có sản phẩm yêu thích" />
          ) : productsLoading ? (
            <div className="favorites-page__grid favorites-page__grid--products">
              <Skeleton className="favorites-page__skeleton-product" />
            </div>
          ) : (
            <div className="favorites-page__grid favorites-page__grid--products">
              {products.map((p) => (
                <ProductCardView key={p.id} product={p} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="markets" className="favorites-page__grid">
          {marketIds.length === 0 ? (
            <EmptyState title="Chưa có chợ yêu thích" />
          ) : (
            markets.map((m) => (m ? <MarketCard key={m.id} market={m} /> : null))
          )}
        </TabsContent>
      </Tabs>

      <Button asChild variant="link" className="favorites-page__explore">
        <Link to="/products">Tiếp tục khám phá</Link>
      </Button>
    </div>
  );
}
