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
    const { marketIds, farmerIds, productIds, markets, farmers, products, farmersLoading, productsLoading, } = useFavoriteDetails();
    return (<div className="favorites-page">
      <PageHeader eyebrow="Saved for later" title="Saved favorites" description="Stalls, produce, and markets you want to come back to."/>
      <Tabs defaultValue="farmers">
        <TabsList>
          <TabsTrigger value="farmers">Stalls ({farmerIds.length})</TabsTrigger>
          <TabsTrigger value="products">Produce ({productIds.length})</TabsTrigger>
          <TabsTrigger value="markets">Markets ({marketIds.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="farmers" className="favorites-page__stack">
          {farmerIds.length === 0 ? (<EmptyState title="No saved stalls yet" description="Heart a stall while browsing to keep it here." actionLabel="Explore stalls" onAction={() => navigate('/farmers')}/>) : farmersLoading ? (<Skeleton className="favorites-page__skeleton-card"/>) : (farmers.map((f) => (f ? <FarmerCard key={f.id} farmer={f}/> : null)))}
        </TabsContent>

        <TabsContent value="products">
          {productIds.length === 0 ? (<EmptyState title="No saved produce yet" description="Save items you love so they are easy to find again."/>) : productsLoading ? (<div className="favorites-page__grid favorites-page__grid--products">
              <Skeleton className="favorites-page__skeleton-product"/>
            </div>) : (<div className="favorites-page__grid favorites-page__grid--products">
              {products.map((p) => (<ProductCardView key={p.id} product={p}/>))}
            </div>)}
        </TabsContent>

        <TabsContent value="markets" className="favorites-page__grid">
          {marketIds.length === 0 ? (<EmptyState title="No saved markets yet" description="Favorite a market to pin it for your next visit."/>) : (markets.map((m) => (m ? <MarketCard key={m.id} market={m}/> : null)))}
        </TabsContent>
      </Tabs>

      <Button asChild variant="link" className="favorites-page__explore">
        <Link to="/products">Keep exploring produce</Link>
      </Button>
    </div>);
}
