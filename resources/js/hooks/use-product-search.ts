import { useEffect, useMemo, useState } from 'react';
import type { PosItem } from '@/types/pos';

export function useProductSearch(teamSlug: string, initialProducts: PosItem[]) {
    const [search, setSearch] = useState('');
    const [serverResults, setServerResults] =
        useState<PosItem[]>(initialProducts);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const controller = new AbortController();

        const timeout = window.setTimeout(() => {
            setLoading(true);
            fetch(
                `/${teamSlug}/pos/products/search?search=${encodeURIComponent(search)}`,
                {
                    headers: { Accept: 'application/json' },
                    signal: controller.signal,
                },
            )
                .then((r) => {
                    if (!r.ok) {
                        throw new Error('Search failed');
                    }

                    return r.json() as Promise<{ products: PosItem[] }>;
                })
                .then((data) => setServerResults(data.products))
                .catch((err: unknown) => {
                    if (
                        err instanceof DOMException &&
                        err.name === 'AbortError'
                    ) {
                        return;
                    }
                })
                .finally(() => setLoading(false));
        }, 280);

        return () => {
            window.clearTimeout(timeout);
            controller.abort();
        };
    }, [search, teamSlug]);

    // Client-side fuzzy filter on top of server results
    const filteredProducts = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        if (!keyword) {
            return serverResults;
        }

        return serverResults.filter(
            (p) =>
                p.name.toLowerCase().includes(keyword) ||
                p.sku.toLowerCase().includes(keyword) ||
                p.barcode?.toLowerCase() === keyword ||
                (p.category?.name.toLowerCase().includes(keyword) ?? false),
        );
    }, [serverResults, search]);

    async function findByBarcode(barcode: string): Promise<PosItem | null> {
        const response = await fetch(
            `/${teamSlug}/pos/products/search?search=${encodeURIComponent(barcode)}`,
            { headers: { Accept: 'application/json' } },
        );

        if (!response.ok) {
            return null;
        }

        const data = (await response.json()) as { products: PosItem[] };

        return (
            data.products.find(
                (item) => item.barcode === barcode || item.sku === barcode,
            ) ?? null
        );
    }

    return { search, setSearch, filteredProducts, loading, findByBarcode };
}
