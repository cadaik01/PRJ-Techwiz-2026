import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { X } from 'lucide-react';

import { EmptyState } from '@/components/common/feedback/EmptyState';
import { ProductCardView } from '../../components/guest/ProductCardView';
import {
  useCategories,
  useInfiniteProducts,
  useMarkets,
} from '../../hooks/queries/guest/useCatalog';
import { Button } from '@/components/common/forms/Button';
import { Input } from '@/components/common/forms/Input';
import { Skeleton } from '@/components/common/feedback/Skeleton';

import './ProductsPage.css';

function parseProductSort(value        )              {
  if (
    value === 'newest' ||
    value === 'price_asc' ||
    value === 'price_desc' ||
    value === 'rating'
  ) {
    return value;
  }
  return 'newest';
}

export default function ProductsPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const marketId = params.get('market_id') ?? undefined;
  const categoryIds = (params.get('category') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const minPrice = params.get('price_min') ? Number(params.get('price_min')) : undefined;
  const maxPrice = params.get('price_max') ? Number(params.get('price_max')) : undefined;
  const inStock = params.get('in_stock') === 'true';
  const sortParam = params.get('ordering') ?? params.get('sort');
  const sort = sortParam ? parseProductSort(sortParam) : 'newest';

  const categoriesQuery = useCategories();
  const marketsQuery = useMarkets({ page_size: 20, ordering: 'name' });
  const marketIdNum = marketId ? Number(marketId) : undefined;
  const categoryIdNums = categoryIds
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id));
  const productsQuery = useInfiniteProducts({
    q: q || undefined,
    market_id: marketIdNum,
    category: categoryIdNums.length ? categoryIdNums : undefined,
    price_min: minPrice,
    price_max: maxPrice,
    in_stock: inStock || undefined,
    ordering: sort,
    page_size: 10,
  });

  const items = useMemo(
    () => productsQuery.data?.pages.flatMap((p) => p.results) ?? [],
    [productsQuery.data],
  );

  useEffect(() => {
    const onScroll = () => {
      if (
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 400 &&
        productsQuery.hasNextPage &&
        !productsQuery.isFetchingNextPage
      ) {
        void productsQuery.fetchNextPage();
      }
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [productsQuery]);

  function updateParam(key        , value               ) {
    const next = new URLSearchParams(params);
    if (!value) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  }

  function toggleCategory(id                 ) {
    const key = String(id);
    const set = new Set(categoryIds);
    if (set.has(key)) set.delete(key);
    else set.add(key);
    updateParam('category', set.size ? [...set].join(',') : null);
  }

  const chips                                                           = [];
  if (q) chips.push({ key: 'q', label: `“${q}”`, clear: () => updateParam('q', null) });
  if (marketId) {
    const name =
      marketsQuery.data?.results.find((m) => String(m.id) === marketId)?.name ??
      'Selected market';
    chips.push({
      key: 'market',
      label: name,
      clear: () => updateParam('market_id', null),
    });
  }
  for (const id of categoryIds) {
    const name = categoriesQuery.data?.find((c) => String(c.id) === id)?.name ?? id;
    chips.push({
      key: id,
      label: name,
      clear: () => toggleCategory(id),
    });
  }
  if (inStock) {
    chips.push({
      key: 'stock',
      label: 'In stock',
      clear: () => updateParam('in_stock', null),
    });
  }

  return (
    <div className="products-page">
      <section className="products-page__hero">
        <div className="products-page__hero-inner">
          <div className="products-page__hero-copy">
            <p className="products-page__eyebrow">Fresh from the stall</p>
            <h1 className="products-page__title">Market produce</h1>
            <p className="products-page__subtitle">
              Filter by category, price, market, or stock — then pre-order and
              pick up when it suits you.
            </p>
          </div>
        </div>
      </section>

      <div className="products-page__body">
        <div className="products-page__layout">
          <aside className="products-page__sidebar">
            <div>
              <p className="products-page__filter-label">Search</p>
              <div className="products-page__search-wrap">
                <Input
                  defaultValue={q}
                  label="Search by product name"
                  className="products-page__search-input"
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return;
                    updateParam('q', e.currentTarget.value.trim() || null);
                  }}
                />
              </div>
            </div>

            <div>
              <p className="products-page__filter-label">Categories</p>
              <div className="products-page__category-list">
                {categoriesQuery.data?.map((cat) => {
                  const checked = categoryIds.includes(String(cat.id));
                  return (
                    <label
                      key={cat.id}
                      className={
                        checked
                          ? 'products-page__check-row products-page__check-row--active'
                          : 'products-page__check-row'
                      }
                    >
                      <input
                        type="checkbox"
                        className="products-page__checkbox"
                        checked={checked}
                        onChange={() => toggleCategory(cat.id)}
                      />
                      {cat.name}
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="products-page__filter-label">Price range ($)</p>
              <div className="products-page__price-row">
                <Input
                  type="number"
                  label="Min"
                  defaultValue={minPrice ?? ''}
                  onBlur={(e) =>
                    updateParam('price_min', e.target.value ? e.target.value : null)
                  }
                />
                <Input
                  type="number"
                  label="Max"
                  defaultValue={maxPrice ?? ''}
                  onBlur={(e) =>
                    updateParam('price_max', e.target.value ? e.target.value : null)
                  }
                />
              </div>
            </div>

            <div>
              <p className="products-page__filter-label">Market</p>
              <select
                className="products-page__select"
                value={marketId ?? ''}
                onChange={(e) => updateParam('market_id', e.target.value || null)}
              >
                <option value="">All markets</option>
                {marketsQuery.data?.results.map((m) => (
                  <option key={m.id} value={String(m.id)}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <label
              className={
                inStock
                  ? 'products-page__check-row products-page__check-row--active'
                  : 'products-page__check-row'
              }
            >
              <input
                type="checkbox"
                className="products-page__checkbox"
                checked={inStock}
                onChange={(e) =>
                  updateParam('in_stock', e.target.checked ? 'true' : null)
                }
              />
              In stock only
            </label>

            <div>
              <p className="products-page__filter-label">Sort by</p>
              <select
                className="products-page__select"
                value={sort}
                onChange={(e) =>
                  updateParam('ordering', parseProductSort(e.target.value))
                }
              >
                <option value="newest">Newest arrivals</option>
                <option value="price_asc">Price: low to high</option>
                <option value="price_desc">Price: high to low</option>
                <option value="rating">Top rated</option>
              </select>
            </div>
          </aside>

          <div>
            {chips.length > 0 ? (
              <div className="products-page__chips">
                {chips.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    className="products-page__chip"
                    onClick={chip.clear}
                  >
                    {chip.label}
                    <X className="products-page__chip-icon" aria-hidden />
                  </button>
                ))}
              </div>
            ) : null}

            {productsQuery.isLoading ? (
              <div className="products-page__grid">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="products-page__skeleton" />
                ))}
              </div>
            ) : productsQuery.isError ? (
              <EmptyState
                title="Products couldn't be loaded"
                actionLabel="Try again"
                onAction={() => productsQuery.refetch()}
              />
            ) : items.length === 0 ? (
              <EmptyState
                title="No produce matches your filters"
                description="Widen the price range, clear a category, or try a different search."
              />
            ) : (
              <>
                <div className="products-page__grid">
                  {items.map((product) => (
                    <ProductCardView key={product.id} product={product} />
                  ))}
                </div>
                <div className="products-page__load-more">
                  {productsQuery.hasNextPage ? (
                    <Button
                      variant="outline"
                      size="lg"
                      className="products-page__btn-press"
                      loading={productsQuery.isFetchingNextPage}
                      onClick={() => productsQuery.fetchNextPage()}
                    >
                      Show more produce
                    </Button>
                  ) : (
                    <p className="products-page__end-note">You have reached the end</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
