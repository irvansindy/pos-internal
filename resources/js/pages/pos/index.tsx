import { Head, Link, router } from '@inertiajs/react';
import { Banknote, Receipt } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/use-cart';
import { useProductSearch } from '@/hooks/use-product-search';
import type {
    AppliedVoucher,
    AvailableVoucher,
    PaymentMethod,
    PosCustomer,
    PosDiningTable,
    PosItem,
    RecentTransaction,
} from '@/types/pos';
import { CartPanel } from './components/cart-panel';
import { ProductGrid } from './components/product-grid';
import { RecentTransactions } from './components/recent-transactions';
import { parseNumberInput } from './pos-utils';

interface Props {
    products: PosItem[];
    recentTransactions: RecentTransaction[];
    vouchers: AvailableVoucher[];
    teamSlug: string;
    paymentMethods: PaymentMethod[];
    canApplyVoucher: boolean;
    taxRate: number;
    canVoid: boolean;
    customers: PosCustomer[];
    diningTables: PosDiningTable[];
    loyaltyPointValue: number;
    activeCashierShift: { id: number; opened_at: string } | null;
    canManageCashierShift: boolean;
}

export default function PosIndex({
    products,
    recentTransactions,
    vouchers,
    teamSlug,
    paymentMethods,
    canApplyVoucher,
    taxRate,
    canVoid,
    customers,
    diningTables,
    loyaltyPointValue,
    activeCashierShift,
    canManageCashierShift,
}: Props) {
    const defaultPaymentMethod = paymentMethods[0]?.value ?? 'cash';

    // ── Hooks ──────────────────────────────────────────────────────────────────
    const {
        cart,
        subtotal,
        addToCart,
        setQuantity,
        setSerialIds,
        removeFromCart,
        clearCart,
    } = useCart();
    const { search, setSearch, filteredProducts, loading, findByBarcode } =
        useProductSearch(teamSlug, products);

    async function addScannedProduct(barcode: string): Promise<boolean> {
        const product = await findByBarcode(barcode);

        if (!product) {
            setErrors({
                barcode: 'Barcode tidak ditemukan pada katalog aktif.',
            });

            return false;
        }

        addToCart(product);
        setErrors((current) => ({ ...current, barcode: '' }));

        return true;
    }

    // ── Checkout form state ────────────────────────────────────────────────────
    const [customerName, setCustomerName] = useState('');
    const [customerId, setCustomerId] = useState('');
    const [diningTableId, setDiningTableId] = useState('');
    const [pointsToRedeem, setPointsToRedeem] = useState('0');
    const [voucherCode, setVoucherCode] = useState('');
    const [paymentMethod, setPaymentMethod] = useState(defaultPaymentMethod);
    const [paidAmount, setPaidAmount] = useState('');
    const [note, setNote] = useState('');
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [appliedVoucher, setAppliedVoucher] = useState<AppliedVoucher | null>(
        null,
    );
    const [voucherMessage, setVoucherMessage] = useState<string | null>(null);
    const [voucherChecking, setVoucherChecking] = useState(false);
    const [availablePromotions, setAvailablePromotions] = useState<
        (PosItem & { suggested_quantity: number })[]
    >([]);
    const [customerOptions, setCustomerOptions] = useState(customers);

    const activeVoucher =
        voucherCode.trim() !== '' &&
        subtotal > 0 &&
        cart.length > 0 &&
        appliedVoucher?.code === voucherCode.trim()
            ? appliedVoucher
            : null;
    const activeVoucherMessage =
        voucherCode.trim() !== '' && !activeVoucher ? voucherMessage : null;

    useEffect(() => {
        if (!canApplyVoucher) {
            return;
        }

        const code = voucherCode.trim();

        if (!code || subtotal <= 0 || cart.length === 0) {
            return;
        }

        const controller = new AbortController();
        const timeout = window.setTimeout(() => {
            setVoucherChecking(true);

            fetch(`/${teamSlug}/pos/voucher/validate`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    ...csrfHeaders(),
                },
                body: JSON.stringify({ voucher_code: code, subtotal }),
                signal: controller.signal,
            })
                .then(async (response) => {
                    const data =
                        (await response.json()) as ValidateVoucherResponse;

                    if (!response.ok || !data.valid) {
                        throw new Error(
                            data.message ??
                                'Voucher tidak valid atau tidak memenuhi syarat transaksi.',
                        );
                    }

                    setAppliedVoucher({
                        ...data.voucher,
                        discount_total: Number(data.discount_total ?? 0),
                    });
                    setVoucherMessage(data.message ?? null);
                })
                .catch((error: unknown) => {
                    if (
                        error instanceof DOMException &&
                        error.name === 'AbortError'
                    ) {
                        return;
                    }

                    setAppliedVoucher(null);
                    setVoucherMessage(
                        error instanceof Error
                            ? error.message
                            : 'Voucher tidak valid.',
                    );
                })
                .finally(() => setVoucherChecking(false));
        }, 320);

        return () => {
            window.clearTimeout(timeout);
            controller.abort();
        };
    }, [canApplyVoucher, cart.length, subtotal, teamSlug, voucherCode]);

    // Deteksi otomatis promosi BXGY dari isi keranjang — kasir tidak
    // perlu tahu/mencari nama promosinya secara manual lagi.
    const cartProductLines = cart
        .filter((item) => item.product.item_type === 'product')
        .map((item) => ({
            product_id: item.product.item_id,
            quantity: item.quantity,
        }));
    const cartProductLinesKey = JSON.stringify(cartProductLines);

    useEffect(() => {
        if (cartProductLines.length === 0) {
            return;
        }

        const controller = new AbortController();
        const timeout = window.setTimeout(() => {
            fetch(`/${teamSlug}/pos/promotions/evaluate`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    ...csrfHeaders(),
                },
                body: JSON.stringify({ items: cartProductLines }),
                signal: controller.signal,
            })
                .then(async (response) => {
                    if (!response.ok) {
                        return;
                    }

                    const data =
                        (await response.json()) as EvaluatePromotionsResponse;
                    setAvailablePromotions(data.promotions ?? []);
                })
                .catch((error: unknown) => {
                    if (
                        error instanceof DOMException &&
                        error.name === 'AbortError'
                    ) {
                        return;
                    }
                });
        }, 320);

        return () => {
            window.clearTimeout(timeout);
            controller.abort();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cartProductLinesKey, teamSlug]);

    function applyPromotion(
        promotion: PosItem & { suggested_quantity: number },
    ) {
        addToCart(promotion);
        setQuantity(promotion, promotion.suggested_quantity);
    }

    async function createCustomer() {
        const name = window.prompt('Nama pelanggan:');

        if (!name) {
            return;
        }

        const phone = window.prompt('Nomor HP pelanggan:');

        if (!phone) {
            return;
        }

        const email = window.prompt('Email pelanggan (opsional):') ?? '';
        const response = await fetch(`/${teamSlug}/customers`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                ...csrfHeaders(),
            },
            body: JSON.stringify({ name, phone, email: email || null }),
        });
        const data = (await response.json()) as {
            customer?: PosCustomer;
            message?: string;
            errors?: Record<string, string[]>;
        };

        if (!response.ok || !data.customer) {
            setErrors({
                customer_id:
                    data.message ??
                    Object.values(data.errors ?? {})[0]?.[0] ??
                    'Pelanggan gagal ditambahkan.',
            });

            return;
        }

        setCustomerOptions((current) =>
            [...current, data.customer!].sort((a, b) =>
                a.name.localeCompare(b.name),
            ),
        );
        setCustomerId(String(data.customer.id));
        setCustomerName(data.customer.name);
    }

    // ── Validation ────────────────────────────────────────────────────────────
    function validateCheckout(): string | null {
        const paid = parseNumberInput(paidAmount);

        if (cart.length === 0) {
            return 'Keranjang transaksi masih kosong.';
        }

        const incompleteSerialItem = cart.find(
            (item) =>
                item.product.tracks_serials &&
                item.serial_ids.length !==
                    item.quantity * (item.product.unit_conversion ?? 1),
        );

        if (incompleteSerialItem) {
            return `Pilih nomor serial untuk setiap unit ${incompleteSerialItem.product.name}.`;
        }

        if (!paymentMethod) {
            return 'Metode pembayaran wajib dipilih.';
        }

        if (!paidAmount.trim() && !diningTableId) {
            return 'Jumlah bayar wajib diisi.';
        }

        if (
            !Number.isFinite(paid) ||
            paid < 0 ||
            (paid === 0 && !diningTableId)
        ) {
            return diningTableId
                ? 'Jumlah bayar tidak boleh negatif.'
                : 'Jumlah bayar wajib lebih dari 0.';
        }

        if (paid > 0 && !activeCashierShift) {
            return 'Buka shift kasir sebelum menerima pembayaran.';
        }

        return null;
    }

    // ── Submit ────────────────────────────────────────────────────────────────
    function submitTransaction() {
        setErrors({});
        const error = validateCheckout();

        if (error) {
            setErrors({ paid_amount: error });

            return;
        }

        setProcessing(true);

        router.post(
            `/${teamSlug}/pos/transaction`,
            {
                customer_name: customerName || null,
                customer_id: customerId || null,
                dining_table_id: diningTableId || null,
                points_to_redeem: Number(pointsToRedeem || 0),
                voucher_code: voucherCode || null,
                payment_method: paymentMethod,
                paid_amount: String(parseNumberInput(paidAmount)),
                note: note || null,
                items: cart.map((item) => ({
                    item_type: item.product.item_type,
                    item_id: item.product.item_id,
                    quantity: item.quantity,
                    unit_id: item.product.unit_id ?? null,
                    inventory_serial_ids: item.serial_ids,
                })),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    clearCart();
                    setCustomerName('');
                    setCustomerId('');
                    setDiningTableId('');
                    setPointsToRedeem('0');
                    setVoucherCode('');
                    setAppliedVoucher(null);
                    setVoucherMessage(null);
                    setPaidAmount('');
                    setNote('');
                },
                onError: (e) => setErrors(e),
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
                {/* Page header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1
                            style={{
                                margin: '0 0 4px',
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

                {!activeCashierShift && (
                    <div className="flex flex-col gap-3 rounded-md border border-amber-700/40 bg-amber-50 p-4 text-amber-950 sm:flex-row sm:items-center sm:justify-between dark:border-amber-400/40 dark:bg-amber-950/40 dark:text-amber-100">
                        <div>
                            <p className="font-medium">
                                Shift kasir belum dibuka
                            </p>
                            <p className="mt-1 text-sm">
                                {canManageCashierShift
                                    ? 'Pesanan meja tanpa pembayaran tetap dapat dibuat. Buka shift sebelum menerima uang.'
                                    : 'Pesanan meja tanpa pembayaran tetap dapat dibuat. Hubungi admin untuk menerima pembayaran.'}
                            </p>
                        </div>
                        {canManageCashierShift && (
                            <Button
                                asChild
                                variant="outline"
                                className="h-11 shrink-0 border-current"
                            >
                                <Link href={`/${teamSlug}/cashier-operations`}>
                                    <Banknote aria-hidden="true" />
                                    Buka Shift
                                </Link>
                            </Button>
                        )}
                    </div>
                )}

                {/* Main two-column layout */}
                <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
                    {/* Left: product catalogue + recent transactions */}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px',
                        }}
                    >
                        <ProductGrid
                            search={search}
                            onSearchChange={setSearch}
                            products={filteredProducts}
                            loading={loading}
                            onSelectProduct={addToCart}
                            onBarcodeSubmit={addScannedProduct}
                            searchError={errors.barcode}
                        />
                        <RecentTransactions
                            transactions={recentTransactions}
                            paymentMethods={paymentMethods}
                            defaultPaymentMethod={defaultPaymentMethod}
                            teamSlug={teamSlug}
                            canVoid={canVoid}
                        />
                    </div>

                    {/* Right: cart + checkout */}
                    <CartPanel
                        cart={cart}
                        subtotal={subtotal}
                        taxRate={taxRate}
                        paymentMethods={paymentMethods}
                        vouchers={vouchers}
                        canApplyVoucher={canApplyVoucher}
                        appliedVoucher={activeVoucher}
                        voucherMessage={activeVoucherMessage}
                        voucherChecking={voucherChecking}
                        availablePromotions={
                            cartProductLines.length === 0
                                ? []
                                : availablePromotions
                        }
                        onApplyPromotion={applyPromotion}
                        customerName={customerName}
                        customers={customerOptions}
                        customerId={customerId}
                        diningTables={diningTables}
                        diningTableId={diningTableId}
                        pointsToRedeem={pointsToRedeem}
                        loyaltyPointValue={loyaltyPointValue}
                        voucherCode={voucherCode}
                        paymentMethod={paymentMethod}
                        paidAmount={paidAmount}
                        note={note}
                        processing={processing}
                        errors={errors}
                        onSetQuantity={setQuantity}
                        onSetSerialIds={setSerialIds}
                        onRemoveItem={removeFromCart}
                        onClearCart={clearCart}
                        onSetCustomerName={setCustomerName}
                        onSetCustomerId={(value) => {
                            setCustomerId(value);
                            const customer = customerOptions.find(
                                (row) => String(row.id) === value,
                            );

                            if (customer) {
                                setCustomerName(customer.name);
                            }

                            setPointsToRedeem('0');
                        }}
                        onCreateCustomer={createCustomer}
                        onSetDiningTableId={setDiningTableId}
                        onSetPointsToRedeem={setPointsToRedeem}
                        onSetVoucherCode={(value) => {
                            setVoucherCode(value);
                            setVoucherMessage(null);
                        }}
                        onSetPaymentMethod={setPaymentMethod}
                        onSetPaidAmount={setPaidAmount}
                        onClearPaidAmountError={() =>
                            setErrors((e) => {
                                const n = { ...e };
                                delete n.paid_amount;

                                return n;
                            })
                        }
                        onSetNote={setNote}
                        onSubmit={submitTransaction}
                    />
                </div>
            </div>
        </>
    );
}

interface ValidateVoucherResponse {
    valid: boolean;
    voucher: Omit<AppliedVoucher, 'discount_total'>;
    discount_total: number | string;
    message?: string;
}

interface EvaluatePromotionsResponse {
    promotions: (PosItem & { suggested_quantity: number })[];
}

function csrfHeaders(): Record<string, string> {
    const token = document.cookie
        .split('; ')
        .find((row) => row.startsWith('XSRF-TOKEN='))
        ?.split('=')[1];

    return token ? { 'X-XSRF-TOKEN': decodeURIComponent(token) } : {};
}
