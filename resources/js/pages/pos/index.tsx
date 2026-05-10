import { Head, router } from '@inertiajs/react';
import {
    Banknote,
    Minus,
    Plus,
    Receipt,
    Search,
    ShoppingCart,
    Trash2,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

interface Category {
    id: number;
    name: string;
}

interface Product {
    id: number;
    category_id: number | null;
    sku: string;
    name: string;
    price: string;
    stock: number;
    min_stock: number;
    category?: Category | null;
}

interface CartItem {
    product: Product;
    quantity: number;
}

interface PaymentMethod {
    value: string;
    label: string;
}

interface RecentTransaction {
    id: number;
    invoice_number: string;
    customer_name: string | null;
    status: 'pending' | 'completed' | 'void';
    payment_status: 'unpaid' | 'partial' | 'paid';
    grand_total: string;
    paid_amount: string;
    change_amount: string;
    created_at: string;
    cashier?: {
        id: number;
        name: string;
    } | null;
}

interface Props {
    products: Product[];
    recentTransactions: RecentTransaction[];
    teamSlug: string;
    paymentMethods: PaymentMethod[];
    canApplyVoucher: boolean;
}

function buildUrl(path: string, teamSlug: string): string {
    return `/${teamSlug}${path}`;
}

function formatCurrency(value: string | number): string {
    const amount = typeof value === 'number' ? value : parseFloat(value || '0');

    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

function formatDate(value: string): string {
    return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));
}

function paymentStatusLabel(
    status: RecentTransaction['payment_status'],
): string {
    if (status === 'paid') {
        return 'Lunas';
    }

    if (status === 'partial') {
        return 'Sebagian';
    }

    return 'Belum Bayar';
}

function Badge({
    children,
    color = 'default',
}: {
    children: React.ReactNode;
    color?: 'default' | 'green' | 'amber' | 'red' | 'blue';
}) {
    const colors = {
        default: { bg: 'var(--muted)', text: 'var(--muted-foreground)' },
        green: { bg: 'hsl(142 76% 92%)', text: 'hsl(142 76% 30%)' },
        amber: { bg: 'hsl(43 96% 92%)', text: 'hsl(43 96% 30%)' },
        red: { bg: 'hsl(0 72% 94%)', text: 'hsl(0 72% 40%)' },
        blue: { bg: 'hsl(214 100% 95%)', text: 'hsl(214 100% 40%)' },
    };
    const c = colors[color];

    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '999px',
                backgroundColor: c.bg,
                color: c.text,
                fontSize: '11px',
                fontWeight: 700,
            }}
        >
            {children}
        </span>
    );
}

export default function PosIndex({
    products,
    recentTransactions,
    teamSlug,
    paymentMethods,
    canApplyVoucher,
}: Props) {
    const [search, setSearch] = useState('');
    const [productResults, setProductResults] = useState(products);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [customerName, setCustomerName] = useState('');
    const [voucherCode, setVoucherCode] = useState('');
    const [paymentMethod, setPaymentMethod] = useState(
        paymentMethods[0]?.value ?? 'cash',
    );
    const [paidAmount, setPaidAmount] = useState('');
    const [note, setNote] = useState('');
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const filteredProducts = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        return productResults.filter((product) => {
            if (!keyword) {
                return true;
            }

            return (
                product.name.toLowerCase().includes(keyword) ||
                product.sku.toLowerCase().includes(keyword) ||
                (product.category?.name.toLowerCase().includes(keyword) ??
                    false)
            );
        });
    }, [productResults, search]);

    useEffect(() => {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => {
            fetch(
                `${buildUrl('/pos/products/search', teamSlug)}?search=${encodeURIComponent(search)}`,
                {
                    headers: { Accept: 'application/json' },
                    signal: controller.signal,
                },
            )
                .then((response) => response.json())
                .then((payload: { products: Product[] }) =>
                    setProductResults(payload.products),
                )
                .catch((error: unknown) => {
                    if (
                        error instanceof DOMException &&
                        error.name === 'AbortError'
                    ) {
                        return;
                    }
                });
        }, 250);

        return () => {
            window.clearTimeout(timeout);
            controller.abort();
        };
    }, [search, teamSlug]);

    const subtotal = useMemo(
        () =>
            cart.reduce(
                (total, item) =>
                    total + parseFloat(item.product.price) * item.quantity,
                0,
            ),
        [cart],
    );
    const paid = parseFloat(paidAmount || '0');
    const grandTotal = subtotal;
    const changeAmount = Math.max(paid - grandTotal, 0);

    function addToCart(product: Product) {
        setCart((current) => {
            const existing = current.find(
                (item) => item.product.id === product.id,
            );

            if (existing) {
                return current.map((item) =>
                    item.product.id === product.id
                        ? {
                              ...item,
                              quantity: Math.min(
                                  item.quantity + 1,
                                  product.stock,
                              ),
                          }
                        : item,
                );
            }

            return [...current, { product, quantity: 1 }];
        });
    }

    function updateQuantity(productId: number, quantity: number) {
        setCart((current) =>
            current
                .map((item) =>
                    item.product.id === productId
                        ? {
                              ...item,
                              quantity: Math.max(
                                  1,
                                  Math.min(quantity, item.product.stock),
                              ),
                          }
                        : item,
                )
                .filter((item) => item.quantity > 0),
        );
    }

    function removeFromCart(productId: number) {
        setCart((current) =>
            current.filter((item) => item.product.id !== productId),
        );
    }

    function submitTransaction() {
        setProcessing(true);
        setErrors({});

        router.post(
            buildUrl('/pos/transaction', teamSlug),
            {
                customer_name: customerName || null,
                voucher_code: voucherCode || null,
                payment_method: paymentMethod,
                paid_amount: paidAmount || '0',
                note: note || null,
                items: cart.map((item) => ({
                    product_id: item.product.id,
                    quantity: item.quantity,
                })),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setCart([]);
                    setCustomerName('');
                    setVoucherCode('');
                    setPaidAmount('');
                    setNote('');
                },
                onError: (validationErrors) => setErrors(validationErrors),
                onFinish: () => setProcessing(false),
            },
        );
    }

    return (
        <>
            <Head title="POS Kasir" />

            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '16px',
                        alignItems: 'center',
                    }}
                >
                    <div>
                        <h1
                            style={{
                                margin: '0 0 4px 0',
                                color: 'var(--foreground)',
                                fontSize: '24px',
                                fontWeight: 800,
                            }}
                        >
                            POS Kasir
                        </h1>
                        <p
                            style={{
                                margin: 0,
                                color: 'var(--muted-foreground)',
                                fontSize: '13px',
                            }}
                        >
                            Buat transaksi penjualan dan stok produk otomatis
                            berkurang.
                        </p>
                    </div>
                    <div
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: 'var(--muted-foreground)',
                            fontSize: '13px',
                        }}
                    >
                        <Receipt size={16} />
                        {cart.length} item
                    </div>
                </div>

                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(0, 1fr) 420px',
                        gap: '20px',
                        alignItems: 'start',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px',
                        }}
                    >
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
                            <input
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Cari produk, SKU, atau kategori..."
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
                                <strong style={{ fontSize: '14px' }}>
                                    Produk Tersedia
                                </strong>
                                <span
                                    style={{
                                        color: 'var(--muted-foreground)',
                                        fontSize: '12px',
                                    }}
                                >
                                    {filteredProducts.length} produk
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
                                {filteredProducts.length === 0 ? (
                                    <div
                                        style={{
                                            gridColumn: '1 / -1',
                                            padding: '32px 16px',
                                            textAlign: 'center',
                                            color: 'var(--muted-foreground)',
                                            fontSize: '13px',
                                        }}
                                    >
                                        Produk tidak ditemukan.
                                    </div>
                                ) : (
                                    filteredProducts.map((product) => (
                                        <button
                                            key={product.id}
                                            onClick={() => addToCart(product)}
                                            style={{
                                                textAlign: 'left',
                                                border: '1px solid var(--border)',
                                                backgroundColor:
                                                    'var(--background)',
                                                borderRadius: '8px',
                                                padding: '12px',
                                                cursor: 'pointer',
                                                minHeight: '128px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between',
                                            }}
                                        >
                                            <div>
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        justifyContent:
                                                            'space-between',
                                                        gap: '8px',
                                                        marginBottom: '8px',
                                                    }}
                                                >
                                                    <Badge color="blue">
                                                        {product.sku}
                                                    </Badge>
                                                    <Badge
                                                        color={
                                                            product.stock <=
                                                            product.min_stock
                                                                ? 'amber'
                                                                : 'green'
                                                        }
                                                    >
                                                        {product.stock}
                                                    </Badge>
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
                                                    {product.category?.name ??
                                                        'Tanpa kategori'}
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
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>

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
                                }}
                            >
                                <strong style={{ fontSize: '14px' }}>
                                    Transaksi Terbaru
                                </strong>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table
                                    style={{
                                        width: '100%',
                                        borderCollapse: 'collapse',
                                        fontSize: '13px',
                                    }}
                                >
                                    <tbody>
                                        {recentTransactions.length === 0 ? (
                                            <tr>
                                                <td
                                                    style={{
                                                        padding: '24px 16px',
                                                        textAlign: 'center',
                                                        color: 'var(--muted-foreground)',
                                                    }}
                                                >
                                                    Belum ada transaksi.
                                                </td>
                                            </tr>
                                        ) : (
                                            recentTransactions.map(
                                                (transaction) => (
                                                    <tr
                                                        key={transaction.id}
                                                        style={{
                                                            borderBottom:
                                                                '1px solid var(--border)',
                                                        }}
                                                    >
                                                        <td
                                                            style={{
                                                                padding:
                                                                    '12px 16px',
                                                            }}
                                                        >
                                                            <div
                                                                style={{
                                                                    fontWeight: 700,
                                                                }}
                                                            >
                                                                {
                                                                    transaction.invoice_number
                                                                }
                                                            </div>
                                                            <div
                                                                style={{
                                                                    color: 'var(--muted-foreground)',
                                                                    fontSize:
                                                                        '12px',
                                                                }}
                                                            >
                                                                {formatDate(
                                                                    transaction.created_at,
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td
                                                            style={{
                                                                padding:
                                                                    '12px 16px',
                                                            }}
                                                        >
                                                            {transaction.customer_name ??
                                                                'Umum'}
                                                        </td>
                                                        <td
                                                            style={{
                                                                padding:
                                                                    '12px 16px',
                                                            }}
                                                        >
                                                            <Badge
                                                                color={
                                                                    transaction.payment_status ===
                                                                    'paid'
                                                                        ? 'green'
                                                                        : 'amber'
                                                                }
                                                            >
                                                                {paymentStatusLabel(
                                                                    transaction.payment_status,
                                                                )}
                                                            </Badge>
                                                        </td>
                                                        <td
                                                            style={{
                                                                padding:
                                                                    '12px 16px',
                                                                textAlign:
                                                                    'right',
                                                                fontWeight: 800,
                                                            }}
                                                        >
                                                            {formatCurrency(
                                                                transaction.grand_total,
                                                            )}
                                                        </td>
                                                    </tr>
                                                ),
                                            )
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div
                        style={{
                            position: 'sticky',
                            top: '20px',
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
                            <strong
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                }}
                            >
                                <ShoppingCart size={16} />
                                Keranjang
                            </strong>
                            {cart.length > 0 && (
                                <button
                                    onClick={() => setCart([])}
                                    style={{
                                        border: 'none',
                                        background: 'none',
                                        color: 'hsl(0 72% 50%)',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                    }}
                                >
                                    Kosongkan
                                </button>
                            )}
                        </div>

                        <div
                            style={{
                                padding: '16px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '14px',
                            }}
                        >
                            {cart.length === 0 ? (
                                <div
                                    style={{
                                        padding: '40px 16px',
                                        textAlign: 'center',
                                        color: 'var(--muted-foreground)',
                                        fontSize: '13px',
                                    }}
                                >
                                    Pilih produk untuk memulai transaksi.
                                </div>
                            ) : (
                                cart.map((item) => (
                                    <div
                                        key={item.product.id}
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: '1fr auto',
                                            gap: '12px',
                                            borderBottom:
                                                '1px solid var(--border)',
                                            paddingBottom: '12px',
                                        }}
                                    >
                                        <div>
                                            <div
                                                style={{
                                                    fontWeight: 700,
                                                    fontSize: '13px',
                                                }}
                                            >
                                                {item.product.name}
                                            </div>
                                            <div
                                                style={{
                                                    color: 'var(--muted-foreground)',
                                                    fontSize: '12px',
                                                    marginTop: '2px',
                                                }}
                                            >
                                                {formatCurrency(
                                                    item.product.price,
                                                )}
                                            </div>
                                            <div
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    marginTop: '10px',
                                                }}
                                            >
                                                <button
                                                    onClick={() =>
                                                        updateQuantity(
                                                            item.product.id,
                                                            item.quantity - 1,
                                                        )
                                                    }
                                                    style={{
                                                        width: '28px',
                                                        height: '28px',
                                                        borderRadius: '6px',
                                                        border: '1px solid var(--border)',
                                                        backgroundColor:
                                                            'var(--background)',
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    <Minus size={14} />
                                                </button>
                                                <input
                                                    value={item.quantity}
                                                    onChange={(event) =>
                                                        updateQuantity(
                                                            item.product.id,
                                                            Number(
                                                                event.target
                                                                    .value,
                                                            ),
                                                        )
                                                    }
                                                    style={{
                                                        width: '48px',
                                                        height: '28px',
                                                        borderRadius: '6px',
                                                        border: '1px solid var(--border)',
                                                        textAlign: 'center',
                                                        backgroundColor:
                                                            'var(--background)',
                                                        color: 'var(--foreground)',
                                                    }}
                                                />
                                                <button
                                                    onClick={() =>
                                                        updateQuantity(
                                                            item.product.id,
                                                            item.quantity + 1,
                                                        )
                                                    }
                                                    style={{
                                                        width: '28px',
                                                        height: '28px',
                                                        borderRadius: '6px',
                                                        border: '1px solid var(--border)',
                                                        backgroundColor:
                                                            'var(--background)',
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    <Plus size={14} />
                                                </button>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <button
                                                onClick={() =>
                                                    removeFromCart(
                                                        item.product.id,
                                                    )
                                                }
                                                style={{
                                                    border: 'none',
                                                    background: 'none',
                                                    color: 'hsl(0 72% 50%)',
                                                    cursor: 'pointer',
                                                    padding: '2px',
                                                }}
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                            <div
                                                style={{
                                                    marginTop: '24px',
                                                    fontWeight: 800,
                                                }}
                                            >
                                                {formatCurrency(
                                                    parseFloat(
                                                        item.product.price,
                                                    ) * item.quantity,
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}

                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '10px',
                                }}
                            >
                                <input
                                    value={customerName}
                                    onChange={(event) =>
                                        setCustomerName(event.target.value)
                                    }
                                    placeholder="Nama pelanggan (opsional)"
                                    style={inputStyle}
                                />
                                {canApplyVoucher && (
                                    <input
                                        value={voucherCode}
                                        onChange={(event) =>
                                            setVoucherCode(
                                                event.target.value.toUpperCase(),
                                            )
                                        }
                                        placeholder="Kode voucher (opsional)"
                                        style={inputStyle}
                                    />
                                )}
                                <select
                                    value={paymentMethod}
                                    onChange={(event) =>
                                        setPaymentMethod(event.target.value)
                                    }
                                    style={inputStyle}
                                >
                                    {paymentMethods.map((method) => (
                                        <option
                                            key={method.value}
                                            value={method.value}
                                        >
                                            {method.label}
                                        </option>
                                    ))}
                                </select>
                                <input
                                    type="number"
                                    value={paidAmount}
                                    onChange={(event) =>
                                        setPaidAmount(event.target.value)
                                    }
                                    placeholder="Jumlah bayar"
                                    style={inputStyle}
                                />
                                <textarea
                                    value={note}
                                    onChange={(event) =>
                                        setNote(event.target.value)
                                    }
                                    placeholder="Catatan (opsional)"
                                    style={{
                                        ...inputStyle,
                                        height: '68px',
                                        paddingTop: '10px',
                                        resize: 'vertical',
                                    }}
                                />
                            </div>

                            {Object.keys(errors).length > 0 && (
                                <div
                                    style={{
                                        border: '1px solid hsl(0 72% 80%)',
                                        borderRadius: '8px',
                                        backgroundColor: 'hsl(0 72% 96%)',
                                        color: 'hsl(0 72% 36%)',
                                        padding: '10px 12px',
                                        fontSize: '12px',
                                    }}
                                >
                                    {Object.values(errors)[0]}
                                </div>
                            )}

                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px',
                                    borderTop: '1px solid var(--border)',
                                    paddingTop: '14px',
                                }}
                            >
                                <SummaryRow
                                    label="Subtotal"
                                    value={formatCurrency(subtotal)}
                                />
                                <SummaryRow
                                    label="Total"
                                    value={formatCurrency(grandTotal)}
                                    strong
                                />
                                <SummaryRow
                                    label="Bayar"
                                    value={formatCurrency(paid)}
                                />
                                <SummaryRow
                                    label="Kembalian"
                                    value={formatCurrency(changeAmount)}
                                    strong
                                />
                            </div>

                            <button
                                onClick={submitTransaction}
                                disabled={processing || cart.length === 0}
                                style={{
                                    height: '44px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    backgroundColor:
                                        processing || cart.length === 0
                                            ? 'var(--muted)'
                                            : 'hsl(142 70% 36%)',
                                    color:
                                        processing || cart.length === 0
                                            ? 'var(--muted-foreground)'
                                            : 'white',
                                    cursor:
                                        processing || cart.length === 0
                                            ? 'not-allowed'
                                            : 'pointer',
                                    fontWeight: 800,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                }}
                            >
                                <Banknote size={16} />
                                {processing
                                    ? 'Memproses...'
                                    : 'Simpan Transaksi'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

function SummaryRow({
    label,
    value,
    strong = false,
}: {
    label: string;
    value: string;
    strong?: boolean;
}) {
    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                color: strong ? 'var(--foreground)' : 'var(--muted-foreground)',
                fontSize: strong ? '15px' : '13px',
                fontWeight: strong ? 800 : 500,
            }}
        >
            <span>{label}</span>
            <span>{value}</span>
        </div>
    );
}

const inputStyle: React.CSSProperties = {
    width: '100%',
    minHeight: '38px',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--background)',
    color: 'var(--foreground)',
    fontSize: '13px',
    padding: '0 12px',
    outline: 'none',
    boxSizing: 'border-box',
};
