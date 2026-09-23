import { useMemo, useState } from 'react';
import type { CartItem, PosItem } from '@/types/pos';

export function cartItemKey(item: PosItem): string {
    return `${item.item_type}:${item.item_id}:${item.unit_id ?? 'base'}`;
}

export function useCart() {
    const [cart, setCart] = useState<CartItem[]>([]);

    const subtotal = useMemo(
        () =>
            cart.reduce(
                (sum, i) => sum + parseFloat(i.product.price) * i.quantity,
                0,
            ),
        [cart],
    );

    function addToCart(product: PosItem) {
        setCart((prev) => {
            const key = cartItemKey(product);
            const existing = prev.find((i) => cartItemKey(i.product) === key);

            if (existing) {
                return prev.map((i) =>
                    cartItemKey(i.product) === key
                        ? {
                              ...i,
                              quantity: Math.min(i.quantity + 1, product.stock),
                          }
                        : i,
                );
            }

            return [...prev, { product, quantity: 1, serial_ids: [] }];
        });
    }

    function setQuantity(product: PosItem, quantity: number) {
        const key = cartItemKey(product);
        setCart((prev) =>
            prev
                .map((i) =>
                    cartItemKey(i.product) === key
                        ? {
                              ...i,
                              quantity: Math.max(
                                  1,
                                  Math.min(quantity, i.product.stock),
                              ),
                              serial_ids: i.serial_ids.slice(
                                  0,
                                  Math.max(
                                      1,
                                      Math.min(quantity, i.product.stock),
                                  ) * (i.product.unit_conversion ?? 1),
                              ),
                          }
                        : i,
                )
                .filter((i) => i.quantity > 0),
        );
    }

    function removeFromCart(product: PosItem) {
        const key = cartItemKey(product);
        setCart((prev) => prev.filter((i) => cartItemKey(i.product) !== key));
    }

    function setSerialIds(product: PosItem, serialIds: number[]) {
        const key = cartItemKey(product);
        setCart((prev) =>
            prev.map((item) =>
                cartItemKey(item.product) === key
                    ? {
                          ...item,
                          serial_ids: serialIds.slice(
                              0,
                              item.quantity *
                                  (item.product.unit_conversion ?? 1),
                          ),
                      }
                    : item,
            ),
        );
    }

    function clearCart() {
        setCart([]);
    }

    return {
        cart,
        subtotal,
        addToCart,
        setQuantity,
        setSerialIds,
        removeFromCart,
        clearCart,
    };
}
