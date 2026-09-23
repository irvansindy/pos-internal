import { ImageIcon, Search } from 'lucide-react';
import type { PosItem } from '@/types/pos';
import { formatCurrency, itemTypeLabel, PosBadge } from '../pos-utils';

interface Props {
    search: string;
    onSearchChange: (value: string) => void;
    products: PosItem[];
    loading: boolean;
    onSelectProduct: (product: PosItem) => void;
    onBarcodeSubmit: (barcode: string) => Promise<boolean>;
    searchError?: string;
}

export function ProductGrid({
    search,
    onSearchChange,
    products,
    loading,
    onSelectProduct,
    onBarcodeSubmit,
    searchError,
}: Props) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Search bar */}
            <div style={{ position: 'relative' }}>
                <Search
                    size={16}
                    style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--muted-foreground)',
                    }}
                />
                {searchError && (
                    <p className="mt-2 text-sm text-destructive" role="alert">
                        {searchError}
                    </p>
                )}
                <input
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    onKeyDown={async (event) => {
                        if (event.key !== 'Enter' || !search.trim()) {
                            return;
                        }

                        event.preventDefault();

                        if (await onBarcodeSubmit(search.trim())) {
                            onSearchChange('');
                        }
                    }}
                    placeholder="Cari nama/SKU atau scan barcode lalu Enter"
                    aria-label="Cari atau scan barcode produk"
                    style={{
                        width: '100%',
                        height: '40px',
                        paddingLeft: '40px',
                        paddingRight: '12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--background)',
                        color: 'var(--foreground)',
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box',
                    }}
                />
            </div>

            {/* Product catalogue */}
            <div
                style={{
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    backgroundColor: 'var(--card)',
                    overflow: 'hidden',
                }}
            >
                <div
                    style={{
                        padding: '14px 16px',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <strong style={{ fontSize: '14px' }}>Item Tersedia</strong>
                    <span
                        style={{
                            color: 'var(--muted-foreground)',
                            fontSize: '12px',
                        }}
                    >
                        {loading ? 'Memuat...' : `${products.length} item`}
                    </span>
                </div>

                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns:
                            'repeat(auto-fill, minmax(180px, 1fr))',
                        gap: '12px',
                        padding: '16px',
                    }}
                >
                    {products.length === 0 ? (
                        <div
                            style={{
                                gridColumn: '1 / -1',
                                padding: '32px 16px',
                                textAlign: 'center',
                                color: 'var(--muted-foreground)',
                                fontSize: '13px',
                            }}
                        >
                            {loading
                                ? 'Memuat produk...'
                                : 'Item tidak ditemukan.'}
                        </div>
                    ) : (
                        products.map((product) => (
                            <ProductCard
                                key={`${product.item_type}:${product.item_id}:${product.unit_id ?? 'base'}`}
                                product={product}
                                onSelect={onSelectProduct}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

function ProductCard({
    product,
    onSelect,
}: {
    product: PosItem;
    onSelect: (p: PosItem) => void;
}) {
    const isLowStock = product.stock <= product.min_stock;

    return (
        <button
            onClick={() => onSelect(product)}
            disabled={product.stock === 0}
            style={{
                textAlign: 'left',
                border: '1px solid var(--border)',
                backgroundColor:
                    product.stock === 0 ? 'var(--muted)' : 'var(--background)',
                borderRadius: '8px',
                padding: '12px',
                cursor: product.stock === 0 ? 'not-allowed' : 'pointer',
                minHeight: '128px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                opacity: product.stock === 0 ? 0.6 : 1,
            }}
        >
            <div>
                <div
                    style={{
                        width: '100%',
                        aspectRatio: '16 / 9',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        backgroundColor: 'var(--muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '10px',
                        color: 'var(--muted-foreground)',
                    }}
                >
                    {product.image_url ? (
                        <img
                            src={product.image_url}
                            alt=""
                            loading="lazy"
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                            }}
                        />
                    ) : (
                        <ImageIcon size={24} aria-hidden="true" />
                    )}
                </div>
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '4px',
                        marginBottom: '8px',
                        flexWrap: 'wrap',
                    }}
                >
                    <PosBadge color="blue">
                        {itemTypeLabel(product.item_type)}
                    </PosBadge>
                    <PosBadge>{product.sku}</PosBadge>
                    <PosBadge
                        color={
                            product.stock === 0
                                ? 'red'
                                : isLowStock
                                  ? 'amber'
                                  : 'green'
                        }
                    >
                        {product.stock === 0 ? 'Habis' : product.stock}
                    </PosBadge>
                </div>

                <div
                    style={{
                        color: 'var(--foreground)',
                        fontSize: '14px',
                        fontWeight: 700,
                    }}
                >
                    {product.name}
                </div>
                <div
                    style={{
                        color: 'var(--muted-foreground)',
                        fontSize: '12px',
                        marginTop: '4px',
                    }}
                >
                    {product.category?.name ?? 'Tanpa kategori'}
                </div>
            </div>

            <div
                style={{
                    color: 'var(--foreground)',
                    fontWeight: 800,
                    marginTop: '12px',
                }}
            >
                {formatCurrency(product.price)}
                {product.unit_name ? ` / ${product.unit_name}` : ''}
            </div>
        </button>
    );
}
