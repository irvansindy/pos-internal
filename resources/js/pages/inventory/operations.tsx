import { Head, router, useForm } from '@inertiajs/react';
import {
    Boxes,
    ClipboardCheck,
    Hash,
    PackagePlus,
    ReceiptText,
    RotateCcw,
    Truck,
    WalletCards,
} from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type Product = {
    id: number;
    name: string;
    sku: string;
    stock: number;
    cost: string | null;
    base_unit: string;
    tracks_batches: boolean;
    tracks_serials: boolean;
};
type Supplier = { id: number; name: string; phone: string | null };
type POItem = {
    id: number;
    quantity: number;
    received_quantity: number;
    unit_cost: string;
    product: Product;
};
type PO = {
    id: number;
    order_number: string;
    status: string;
    total: string;
    supplier: Supplier;
    items: POItem[];
};
type Opname = {
    id: number;
    opname_number: string;
    created_at: string;
    items: { id: number; difference: number; product: Product }[];
};
type ExpiringProduct = Product & {
    inventory_batches: {
        id: number;
        batch_number: string;
        expires_at: string | null;
        quantity: number;
    }[];
};
type Bin = {
    id: number;
    code: string;
    name: string;
    balances: {
        id: number;
        quantity: number;
        product: Pick<Product, 'id' | 'name' | 'sku'>;
        batch: { id: number; batch_number: string } | null;
    }[];
};
type Warehouse = {
    id: number;
    code: string;
    name: string;
    is_default: boolean;
    bins: Bin[];
};
type PurchaseInvoiceItem = {
    id: number;
    quantity: number;
    returned_quantity: number;
    unit_cost: string;
    subtotal: string;
    landed_cost_amount: string;
    product: Product;
};
type PurchaseInvoice = {
    id: number;
    document_number: string;
    supplier_invoice_number: string;
    invoice_date: string;
    due_date: string | null;
    status: string;
    subtotal: string;
    landed_cost_total: string;
    return_total: string;
    paid_total: string;
    balance_due: string;
    supplier: Supplier;
    purchase_order: { id: number; order_number: string } | null;
    items: PurchaseInvoiceItem[];
};
type SupplierReturn = {
    id: number;
    return_number: string;
    returned_at: string;
    total: string;
    supplier: Supplier;
    items: { id: number }[];
};
type SerialProduct = Pick<Product, 'id' | 'name' | 'sku'> & {
    inventory_serials: {
        id: number;
        serial_number: string;
        status: string;
        inventory_batch_id: number | null;
        warehouse_bin_id: number | null;
        bin: { id: number; name: string; warehouse: Warehouse } | null;
    }[];
};

const currency = (value: string | number) =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(Number(value));

export default function InventoryOperations({
    teamSlug,
    products,
    suppliers,
    purchaseOrders,
    stockOpnames,
    expiringBatches,
    warehouses,
    purchaseInvoices,
    supplierReturns,
    serials,
}: {
    teamSlug: string;
    products: Product[];
    suppliers: Supplier[];
    purchaseOrders: PO[];
    stockOpnames: Opname[];
    expiringBatches: ExpiringProduct[];
    warehouses: Warehouse[];
    purchaseInvoices: PurchaseInvoice[];
    supplierReturns: SupplierReturn[];
    serials: SerialProduct[];
}) {
    const [receiptBatches, setReceiptBatches] = useState<
        Record<number, { batch_number: string; expires_at: string }>
    >({});
    const [receiptLocations, setReceiptLocations] = useState<
        Record<number, string>
    >({});
    const [receiptSerials, setReceiptSerials] = useState<
        Record<number, string>
    >({});
    const [paymentDrafts, setPaymentDrafts] = useState<Record<number, string>>(
        {},
    );
    const [landedCostDrafts, setLandedCostDrafts] = useState<
        Record<number, { description: string; amount: string; method: string }>
    >({});
    const [binDrafts, setBinDrafts] = useState<
        Record<number, { code: string; name: string }>
    >({});
    const supplier = useForm({ name: '', phone: '', email: '', address: '' });
    const warehouse = useForm({
        code: '',
        name: '',
        default_bin_code: '',
        default_bin_name: '',
    });
    const po = useForm({
        supplier_id: '',
        expected_at: '',
        note: '',
        items: [{ product_id: '', quantity: 1, unit_cost: '' }],
    });
    const opname = useForm({
        note: '',
        items: [{ product_id: '', physical_qty: 0, note: '' }],
    });
    const invoice = useForm({
        purchase_order_id: '',
        supplier_invoice_number: '',
        invoice_date: new Date().toISOString().slice(0, 10),
        due_date: '',
        note: '',
    });
    const supplierReturn = useForm({
        purchase_invoice_id: '',
        returned_at: new Date().toISOString().slice(0, 10),
        note: '',
        purchase_invoice_item_id: '',
        quantity: 1,
        inventory_batch_id: '',
        warehouse_bin_id: '',
        inventory_serial_ids: [] as number[],
    });
    const addPoItem = () =>
        po.setData('items', [
            ...po.data.items,
            { product_id: '', quantity: 1, unit_cost: '' },
        ]);
    const addOpnameItem = () =>
        opname.setData('items', [
            ...opname.data.items,
            { product_id: '', physical_qty: 0, note: '' },
        ]);
    const receiveAll = (order: PO) =>
        router.post(
            `/${teamSlug}/inventory-operations/purchase-orders/${order.id}/receive`,
            {
                quantities: Object.fromEntries(
                    order.items.map((item) => [
                        item.id,
                        item.quantity - item.received_quantity,
                    ]),
                ),
                batches: Object.fromEntries(
                    order.items
                        .filter((item) => item.product.tracks_batches)
                        .map((item) => [
                            item.id,
                            receiptBatches[item.id] ?? {
                                batch_number: '',
                                expires_at: '',
                            },
                        ]),
                ),
                locations: Object.fromEntries(
                    order.items.map((item) => [
                        item.id,
                        {
                            warehouse_bin_id: receiptLocations[item.id] || null,
                        },
                    ]),
                ),
                serials: Object.fromEntries(
                    order.items
                        .filter((item) => item.product.tracks_serials)
                        .map((item) => [
                            item.id,
                            (receiptSerials[item.id] ?? '')
                                .split(/\r?\n|,/)
                                .map((value) => value.trim())
                                .filter(Boolean),
                        ]),
                ),
            },
            { preserveScroll: true },
        );
    const selectedReturnInvoice = purchaseInvoices.find(
        (row) => String(row.id) === supplierReturn.data.purchase_invoice_id,
    );
    const selectedReturnItem = selectedReturnInvoice?.items.find(
        (row) =>
            String(row.id) === supplierReturn.data.purchase_invoice_item_id,
    );
    const selectedSerialProduct = serials.find(
        (row) => row.id === selectedReturnItem?.product.id,
    );

    return (
        <>
            <Head title="Inventori & Pembelian" />
            <div className="space-y-6">
                <Heading
                    title="Inventori & Pembelian"
                    description="Kelola lokasi stok, serial, penerimaan, invoice, hutang, landed cost, retur, dan opname dalam satu jejak audit."
                />
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Boxes className="size-4" /> Gudang Baru
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form
                                className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    warehouse.post(
                                        `/${teamSlug}/inventory-operations/warehouses`,
                                        { onSuccess: () => warehouse.reset() },
                                    );
                                }}
                            >
                                <Input
                                    aria-label="Kode gudang"
                                    placeholder="Kode gudang"
                                    value={warehouse.data.code}
                                    onChange={(event) =>
                                        warehouse.setData(
                                            'code',
                                            event.target.value,
                                        )
                                    }
                                />
                                <Input
                                    aria-label="Nama gudang"
                                    placeholder="Nama gudang"
                                    value={warehouse.data.name}
                                    onChange={(event) =>
                                        warehouse.setData(
                                            'name',
                                            event.target.value,
                                        )
                                    }
                                />
                                <Input
                                    aria-label="Kode bin awal"
                                    placeholder="Kode bin awal"
                                    value={warehouse.data.default_bin_code}
                                    onChange={(event) =>
                                        warehouse.setData(
                                            'default_bin_code',
                                            event.target.value,
                                        )
                                    }
                                />
                                <Input
                                    aria-label="Nama bin awal"
                                    placeholder="Nama bin awal"
                                    value={warehouse.data.default_bin_name}
                                    onChange={(event) =>
                                        warehouse.setData(
                                            'default_bin_name',
                                            event.target.value,
                                        )
                                    }
                                />
                                <Button disabled={warehouse.processing}>
                                    Simpan Gudang
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                Saldo per Gudang dan Bin
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-3 sm:grid-cols-2">
                            {warehouses.map((row) => (
                                <div
                                    key={row.id}
                                    className="rounded-md border p-3"
                                >
                                    <div className="font-semibold">
                                        {row.name} ({row.code})
                                    </div>
                                    <div className="mt-2 space-y-2">
                                        {row.bins.map((bin) => (
                                            <div
                                                key={bin.id}
                                                className="rounded bg-muted p-2 text-sm"
                                            >
                                                <div className="font-medium">
                                                    {bin.name} ({bin.code})
                                                </div>
                                                {bin.balances.length === 0 ? (
                                                    <p className="text-xs text-muted-foreground">
                                                        Belum ada stok di lokasi
                                                        ini.
                                                    </p>
                                                ) : (
                                                    <ul className="mt-1 text-xs text-muted-foreground">
                                                        {bin.balances.map(
                                                            (balance) => (
                                                                <li
                                                                    key={
                                                                        balance.id
                                                                    }
                                                                >
                                                                    {
                                                                        balance
                                                                            .product
                                                                            .name
                                                                    }
                                                                    :{' '}
                                                                    {
                                                                        balance.quantity
                                                                    }
                                                                    {balance.batch
                                                                        ? ` · batch ${balance.batch.batch_number}`
                                                                        : ''}
                                                                </li>
                                                            ),
                                                        )}
                                                    </ul>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-3 grid gap-2 sm:grid-cols-[100px_1fr_auto]">
                                        <Input
                                            aria-label={`Kode bin baru ${row.name}`}
                                            placeholder="Kode bin"
                                            value={
                                                binDrafts[row.id]?.code ?? ''
                                            }
                                            onChange={(event) =>
                                                setBinDrafts((current) => ({
                                                    ...current,
                                                    [row.id]: {
                                                        code: event.target
                                                            .value,
                                                        name:
                                                            current[row.id]
                                                                ?.name ?? '',
                                                    },
                                                }))
                                            }
                                        />
                                        <Input
                                            aria-label={`Nama bin baru ${row.name}`}
                                            placeholder="Nama bin"
                                            value={
                                                binDrafts[row.id]?.name ?? ''
                                            }
                                            onChange={(event) =>
                                                setBinDrafts((current) => ({
                                                    ...current,
                                                    [row.id]: {
                                                        code:
                                                            current[row.id]
                                                                ?.code ?? '',
                                                        name: event.target
                                                            .value,
                                                    },
                                                }))
                                            }
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            disabled={
                                                !binDrafts[row.id]?.code ||
                                                !binDrafts[row.id]?.name
                                            }
                                            onClick={() =>
                                                router.post(
                                                    `/${teamSlug}/inventory-operations/warehouses/${row.id}/bins`,
                                                    binDrafts[row.id],
                                                    {
                                                        preserveScroll: true,
                                                        onSuccess: () =>
                                                            setBinDrafts(
                                                                (current) => ({
                                                                    ...current,
                                                                    [row.id]: {
                                                                        code: '',
                                                                        name: '',
                                                                    },
                                                                }),
                                                            ),
                                                    },
                                                )
                                            }
                                        >
                                            Tambah Bin
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
                <div className="grid gap-4 xl:grid-cols-3">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                Supplier Baru
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form
                                className="space-y-3"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    supplier.post(
                                        `/${teamSlug}/inventory-operations/suppliers`,
                                        { onSuccess: () => supplier.reset() },
                                    );
                                }}
                            >
                                <Input
                                    placeholder="Nama supplier"
                                    value={supplier.data.name}
                                    onChange={(e) =>
                                        supplier.setData('name', e.target.value)
                                    }
                                />
                                <Input
                                    placeholder="Nomor telepon"
                                    value={supplier.data.phone}
                                    onChange={(e) =>
                                        supplier.setData(
                                            'phone',
                                            e.target.value,
                                        )
                                    }
                                />
                                <Input
                                    type="email"
                                    placeholder="Email"
                                    value={supplier.data.email}
                                    onChange={(e) =>
                                        supplier.setData(
                                            'email',
                                            e.target.value,
                                        )
                                    }
                                />
                                <Button disabled={supplier.processing}>
                                    <Truck /> Simpan Supplier
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                    <Card className="xl:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-base">
                                Purchase Order Baru
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form
                                className="space-y-3"
                                onSubmit={(e: FormEvent) => {
                                    e.preventDefault();
                                    po.post(
                                        `/${teamSlug}/inventory-operations/purchase-orders`,
                                        { onSuccess: () => po.reset() },
                                    );
                                }}
                            >
                                <select
                                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                                    value={po.data.supplier_id}
                                    onChange={(e) =>
                                        po.setData(
                                            'supplier_id',
                                            e.target.value,
                                        )
                                    }
                                >
                                    <option value="">Pilih supplier</option>
                                    {suppliers.map((row) => (
                                        <option key={row.id} value={row.id}>
                                            {row.name}
                                        </option>
                                    ))}
                                </select>
                                {po.data.items.map((item, index) => (
                                    <div
                                        key={index}
                                        className="grid gap-2 sm:grid-cols-[1fr_90px_140px]"
                                    >
                                        <select
                                            className="h-9 rounded-md border bg-background px-3 text-sm"
                                            value={item.product_id}
                                            onChange={(e) =>
                                                po.setData(
                                                    'items',
                                                    po.data.items.map(
                                                        (row, i) =>
                                                            i === index
                                                                ? {
                                                                      ...row,
                                                                      product_id:
                                                                          e
                                                                              .target
                                                                              .value,
                                                                  }
                                                                : row,
                                                    ),
                                                )
                                            }
                                        >
                                            <option value="">Produk</option>
                                            {products.map((row) => (
                                                <option
                                                    key={row.id}
                                                    value={row.id}
                                                >
                                                    {row.name}
                                                </option>
                                            ))}
                                        </select>
                                        <Input
                                            type="number"
                                            min={1}
                                            value={item.quantity}
                                            onChange={(e) =>
                                                po.setData(
                                                    'items',
                                                    po.data.items.map(
                                                        (row, i) =>
                                                            i === index
                                                                ? {
                                                                      ...row,
                                                                      quantity:
                                                                          Number(
                                                                              e
                                                                                  .target
                                                                                  .value,
                                                                          ),
                                                                  }
                                                                : row,
                                                    ),
                                                )
                                            }
                                        />
                                        <Input
                                            inputMode="numeric"
                                            placeholder="Harga modal"
                                            value={item.unit_cost}
                                            onChange={(e) =>
                                                po.setData(
                                                    'items',
                                                    po.data.items.map(
                                                        (row, i) =>
                                                            i === index
                                                                ? {
                                                                      ...row,
                                                                      unit_cost:
                                                                          e
                                                                              .target
                                                                              .value,
                                                                  }
                                                                : row,
                                                    ),
                                                )
                                            }
                                        />
                                    </div>
                                ))}
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={addPoItem}
                                    >
                                        Tambah Item
                                    </Button>
                                    <Button disabled={po.processing}>
                                        <PackagePlus /> Buat PO
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Riwayat PO</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {purchaseOrders.map((order) => (
                            <div
                                key={order.id}
                                className="rounded-lg border p-3"
                            >
                                <div className="flex justify-between">
                                    <div>
                                        <strong>{order.order_number}</strong>
                                        <p className="text-xs text-muted-foreground">
                                            {order.supplier.name} ·{' '}
                                            {order.status}
                                        </p>
                                    </div>
                                    <strong>
                                        {new Intl.NumberFormat('id-ID', {
                                            style: 'currency',
                                            currency: 'IDR',
                                            maximumFractionDigits: 0,
                                        }).format(Number(order.total))}
                                    </strong>
                                </div>
                                <ul className="mt-3 space-y-3 text-sm">
                                    {order.items.map((item) => (
                                        <li
                                            key={item.id}
                                            className="rounded-md bg-muted/50 p-3"
                                        >
                                            <div>
                                                {item.product.name}:{' '}
                                                {item.received_quantity}/
                                                {item.quantity}{' '}
                                                {item.product.base_unit}
                                            </div>
                                            {item.product.tracks_batches &&
                                                item.received_quantity <
                                                    item.quantity && (
                                                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                                        <Input
                                                            aria-label={`Nomor batch ${item.product.name}`}
                                                            placeholder="Nomor batch"
                                                            value={
                                                                receiptBatches[
                                                                    item.id
                                                                ]
                                                                    ?.batch_number ??
                                                                ''
                                                            }
                                                            onChange={(event) =>
                                                                setReceiptBatches(
                                                                    (
                                                                        current,
                                                                    ) => ({
                                                                        ...current,
                                                                        [item.id]:
                                                                            {
                                                                                batch_number:
                                                                                    event
                                                                                        .target
                                                                                        .value,
                                                                                expires_at:
                                                                                    current[
                                                                                        item
                                                                                            .id
                                                                                    ]
                                                                                        ?.expires_at ??
                                                                                    '',
                                                                            },
                                                                    }),
                                                                )
                                                            }
                                                        />
                                                        <Input
                                                            aria-label={`Kedaluwarsa ${item.product.name}`}
                                                            type="date"
                                                            value={
                                                                receiptBatches[
                                                                    item.id
                                                                ]?.expires_at ??
                                                                ''
                                                            }
                                                            onChange={(event) =>
                                                                setReceiptBatches(
                                                                    (
                                                                        current,
                                                                    ) => ({
                                                                        ...current,
                                                                        [item.id]:
                                                                            {
                                                                                batch_number:
                                                                                    current[
                                                                                        item
                                                                                            .id
                                                                                    ]
                                                                                        ?.batch_number ??
                                                                                    '',
                                                                                expires_at:
                                                                                    event
                                                                                        .target
                                                                                        .value,
                                                                            },
                                                                    }),
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                )}
                                            {item.received_quantity <
                                                item.quantity && (
                                                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                                    <select
                                                        aria-label={`Lokasi penerimaan ${item.product.name}`}
                                                        className="h-9 rounded-md border bg-background px-3 text-sm"
                                                        value={
                                                            receiptLocations[
                                                                item.id
                                                            ] ?? ''
                                                        }
                                                        onChange={(event) =>
                                                            setReceiptLocations(
                                                                (current) => ({
                                                                    ...current,
                                                                    [item.id]:
                                                                        event
                                                                            .target
                                                                            .value,
                                                                }),
                                                            )
                                                        }
                                                    >
                                                        <option value="">
                                                            Lokasi default
                                                        </option>
                                                        {warehouses.flatMap(
                                                            (warehouseRow) =>
                                                                warehouseRow.bins.map(
                                                                    (bin) => (
                                                                        <option
                                                                            key={
                                                                                bin.id
                                                                            }
                                                                            value={
                                                                                bin.id
                                                                            }
                                                                        >
                                                                            {
                                                                                warehouseRow.name
                                                                            }{' '}
                                                                            /{' '}
                                                                            {
                                                                                bin.name
                                                                            }
                                                                        </option>
                                                                    ),
                                                                ),
                                                        )}
                                                    </select>
                                                    {item.product
                                                        .tracks_serials && (
                                                        <textarea
                                                            aria-label={`Nomor serial ${item.product.name}`}
                                                            className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm"
                                                            placeholder="Satu nomor serial per baris"
                                                            value={
                                                                receiptSerials[
                                                                    item.id
                                                                ] ?? ''
                                                            }
                                                            onChange={(event) =>
                                                                setReceiptSerials(
                                                                    (
                                                                        current,
                                                                    ) => ({
                                                                        ...current,
                                                                        [item.id]:
                                                                            event
                                                                                .target
                                                                                .value,
                                                                    }),
                                                                )
                                                            }
                                                        />
                                                    )}
                                                </div>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                                {['ordered', 'partial'].includes(
                                    order.status,
                                ) && (
                                    <Button
                                        className="mt-2"
                                        size="sm"
                                        onClick={() => receiveAll(order)}
                                    >
                                        Terima Semua Sisa
                                    </Button>
                                )}
                            </div>
                        ))}
                    </CardContent>
                </Card>
                <div className="grid gap-4 xl:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <ReceiptText className="size-4" /> Purchase
                                Invoice
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form
                                className="space-y-3"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    invoice.post(
                                        `/${teamSlug}/inventory-operations/purchase-invoices`,
                                        { onSuccess: () => invoice.reset() },
                                    );
                                }}
                            >
                                <select
                                    aria-label="Purchase order sumber invoice"
                                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                                    value={invoice.data.purchase_order_id}
                                    onChange={(event) =>
                                        invoice.setData(
                                            'purchase_order_id',
                                            event.target.value,
                                        )
                                    }
                                >
                                    <option value="">
                                        Pilih PO yang sudah diterima
                                    </option>
                                    {purchaseOrders
                                        .filter((order) =>
                                            order.items.some(
                                                (item) =>
                                                    item.received_quantity > 0,
                                            ),
                                        )
                                        .map((order) => (
                                            <option
                                                key={order.id}
                                                value={order.id}
                                            >
                                                {order.order_number} ·{' '}
                                                {order.supplier.name}
                                            </option>
                                        ))}
                                </select>
                                <Input
                                    aria-label="Nomor invoice supplier"
                                    placeholder="Nomor invoice supplier"
                                    value={invoice.data.supplier_invoice_number}
                                    onChange={(event) =>
                                        invoice.setData(
                                            'supplier_invoice_number',
                                            event.target.value,
                                        )
                                    }
                                />
                                <div className="grid gap-2 sm:grid-cols-2">
                                    <label className="space-y-1 text-xs font-medium">
                                        Tanggal invoice
                                        <Input
                                            type="date"
                                            value={invoice.data.invoice_date}
                                            onChange={(event) =>
                                                invoice.setData(
                                                    'invoice_date',
                                                    event.target.value,
                                                )
                                            }
                                        />
                                    </label>
                                    <label className="space-y-1 text-xs font-medium">
                                        Jatuh tempo
                                        <Input
                                            type="date"
                                            value={invoice.data.due_date}
                                            onChange={(event) =>
                                                invoice.setData(
                                                    'due_date',
                                                    event.target.value,
                                                )
                                            }
                                        />
                                    </label>
                                </div>
                                {Object.values(invoice.errors).map((error) => (
                                    <p
                                        key={error}
                                        className="text-sm text-destructive"
                                    >
                                        {error}
                                    </p>
                                ))}
                                <Button disabled={invoice.processing}>
                                    Catat Invoice
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <RotateCcw className="size-4" /> Retur Supplier
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form
                                className="space-y-3"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    supplierReturn.transform((data) => ({
                                        purchase_invoice_id:
                                            data.purchase_invoice_id,
                                        returned_at: data.returned_at,
                                        note: data.note,
                                        items: [
                                            {
                                                purchase_invoice_item_id:
                                                    data.purchase_invoice_item_id,
                                                quantity: data.quantity,
                                                inventory_batch_id:
                                                    data.inventory_batch_id ||
                                                    null,
                                                warehouse_bin_id:
                                                    data.warehouse_bin_id ||
                                                    null,
                                                inventory_serial_ids:
                                                    data.inventory_serial_ids,
                                            },
                                        ],
                                    }));
                                    supplierReturn.post(
                                        `/${teamSlug}/inventory-operations/supplier-returns`,
                                        {
                                            onSuccess: () =>
                                                supplierReturn.reset(),
                                        },
                                    );
                                }}
                            >
                                <select
                                    aria-label="Invoice untuk retur"
                                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                                    value={
                                        supplierReturn.data.purchase_invoice_id
                                    }
                                    onChange={(event) =>
                                        supplierReturn.setData({
                                            ...supplierReturn.data,
                                            purchase_invoice_id:
                                                event.target.value,
                                            purchase_invoice_item_id: '',
                                            inventory_batch_id: '',
                                            inventory_serial_ids: [],
                                        })
                                    }
                                >
                                    <option value="">
                                        Pilih purchase invoice
                                    </option>
                                    {purchaseInvoices.map((row) => (
                                        <option key={row.id} value={row.id}>
                                            {row.document_number} ·{' '}
                                            {row.supplier.name}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    aria-label="Item invoice untuk retur"
                                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                                    value={
                                        supplierReturn.data
                                            .purchase_invoice_item_id
                                    }
                                    onChange={(event) =>
                                        supplierReturn.setData({
                                            ...supplierReturn.data,
                                            purchase_invoice_item_id:
                                                event.target.value,
                                            inventory_batch_id: '',
                                            warehouse_bin_id: '',
                                            inventory_serial_ids: [],
                                        })
                                    }
                                >
                                    <option value="">Pilih item invoice</option>
                                    {selectedReturnInvoice?.items.map(
                                        (item) => (
                                            <option
                                                key={item.id}
                                                value={item.id}
                                            >
                                                {item.product.name} · tersedia{' '}
                                                {item.quantity -
                                                    item.returned_quantity}
                                            </option>
                                        ),
                                    )}
                                </select>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    <Input
                                        aria-label="Jumlah retur"
                                        type="number"
                                        min={1}
                                        max={
                                            selectedReturnItem
                                                ? selectedReturnItem.quantity -
                                                  selectedReturnItem.returned_quantity
                                                : undefined
                                        }
                                        value={supplierReturn.data.quantity}
                                        onChange={(event) =>
                                            supplierReturn.setData(
                                                'quantity',
                                                Number(event.target.value),
                                            )
                                        }
                                    />
                                    <select
                                        aria-label="Bin asal retur"
                                        className="h-9 rounded-md border bg-background px-3 text-sm"
                                        value={
                                            supplierReturn.data.warehouse_bin_id
                                        }
                                        onChange={(event) =>
                                            supplierReturn.setData({
                                                ...supplierReturn.data,
                                                warehouse_bin_id:
                                                    event.target.value,
                                                inventory_batch_id: '',
                                                inventory_serial_ids: [],
                                            })
                                        }
                                    >
                                        <option value="">Pilih bin asal</option>
                                        {warehouses.flatMap((warehouseRow) =>
                                            warehouseRow.bins.map((bin) => (
                                                <option
                                                    key={bin.id}
                                                    value={bin.id}
                                                >
                                                    {warehouseRow.name} /{' '}
                                                    {bin.name}
                                                </option>
                                            )),
                                        )}
                                    </select>
                                </div>
                                {selectedReturnItem?.product.tracks_batches && (
                                    <select
                                        aria-label="Batch retur"
                                        className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                                        value={
                                            supplierReturn.data
                                                .inventory_batch_id
                                        }
                                        onChange={(event) =>
                                            supplierReturn.setData({
                                                ...supplierReturn.data,
                                                inventory_batch_id:
                                                    event.target.value,
                                                inventory_serial_ids: [],
                                            })
                                        }
                                    >
                                        <option value="">Pilih batch</option>
                                        {expiringBatches
                                            .find(
                                                (row) =>
                                                    row.id ===
                                                    selectedReturnItem.product
                                                        .id,
                                            )
                                            ?.inventory_batches.filter(
                                                (batch) => {
                                                    if (
                                                        !supplierReturn.data
                                                            .warehouse_bin_id
                                                    ) {
                                                        return true;
                                                    }

                                                    return warehouses
                                                        .flatMap(
                                                            (warehouseRow) =>
                                                                warehouseRow.bins,
                                                        )
                                                        .find(
                                                            (bin) =>
                                                                String(
                                                                    bin.id,
                                                                ) ===
                                                                supplierReturn
                                                                    .data
                                                                    .warehouse_bin_id,
                                                        )
                                                        ?.balances.some(
                                                            (balance) =>
                                                                balance.product
                                                                    .id ===
                                                                    selectedReturnItem
                                                                        .product
                                                                        .id &&
                                                                balance.batch
                                                                    ?.id ===
                                                                    batch.id &&
                                                                balance.quantity >
                                                                    0,
                                                        );
                                                },
                                            )
                                            .map((batch) => (
                                                <option
                                                    key={batch.id}
                                                    value={batch.id}
                                                >
                                                    {batch.batch_number} ·{' '}
                                                    {batch.quantity}
                                                </option>
                                            ))}
                                    </select>
                                )}
                                {selectedReturnItem?.product.tracks_serials && (
                                    <fieldset className="rounded-md border p-3">
                                        <legend className="px-1 text-xs font-medium">
                                            Pilih serial yang dikembalikan
                                        </legend>
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            {selectedSerialProduct?.inventory_serials
                                                .filter(
                                                    (serial) =>
                                                        serial.status ===
                                                            'in_stock' &&
                                                        (!supplierReturn.data
                                                            .warehouse_bin_id ||
                                                            String(
                                                                serial.warehouse_bin_id,
                                                            ) ===
                                                                supplierReturn
                                                                    .data
                                                                    .warehouse_bin_id) &&
                                                        (!supplierReturn.data
                                                            .inventory_batch_id ||
                                                            String(
                                                                serial.inventory_batch_id,
                                                            ) ===
                                                                supplierReturn
                                                                    .data
                                                                    .inventory_batch_id),
                                                )
                                                .map((serial) => (
                                                    <label
                                                        key={serial.id}
                                                        className="flex min-h-11 items-center gap-2 rounded border px-3 text-sm"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={supplierReturn.data.inventory_serial_ids.includes(
                                                                serial.id,
                                                            )}
                                                            onChange={(event) =>
                                                                supplierReturn.setData(
                                                                    'inventory_serial_ids',
                                                                    event.target
                                                                        .checked
                                                                        ? [
                                                                              ...supplierReturn
                                                                                  .data
                                                                                  .inventory_serial_ids,
                                                                              serial.id,
                                                                          ]
                                                                        : supplierReturn.data.inventory_serial_ids.filter(
                                                                              (
                                                                                  id,
                                                                              ) =>
                                                                                  id !==
                                                                                  serial.id,
                                                                          ),
                                                                )
                                                            }
                                                        />
                                                        {serial.serial_number}
                                                    </label>
                                                ))}
                                        </div>
                                    </fieldset>
                                )}
                                {Object.values(supplierReturn.errors).map(
                                    (error) => (
                                        <p
                                            key={error}
                                            className="text-sm text-destructive"
                                        >
                                            {error}
                                        </p>
                                    ),
                                )}
                                <Button disabled={supplierReturn.processing}>
                                    Proses Retur
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <WalletCards className="size-4" /> Hutang Supplier
                            dan Landed Cost
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {purchaseInvoices.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                Belum ada purchase invoice. Catat invoice dari
                                PO yang sudah diterima.
                            </p>
                        ) : (
                            purchaseInvoices.map((row) => {
                                const landedDraft = landedCostDrafts[
                                    row.id
                                ] ?? {
                                    description: '',
                                    amount: '',
                                    method: 'value',
                                };

                                return (
                                    <div
                                        key={row.id}
                                        className="rounded-md border p-3"
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                                <strong>
                                                    {row.document_number}
                                                </strong>
                                                <p className="text-xs text-muted-foreground">
                                                    {row.supplier.name} ·
                                                    invoice supplier{' '}
                                                    {
                                                        row.supplier_invoice_number
                                                    }
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-semibold">
                                                    Sisa{' '}
                                                    {currency(row.balance_due)}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {row.status} · jatuh tempo{' '}
                                                    {row.due_date
                                                        ? new Date(
                                                              row.due_date,
                                                          ).toLocaleDateString(
                                                              'id-ID',
                                                          )
                                                        : 'belum ditetapkan'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-3 grid gap-3 lg:grid-cols-2">
                                            <div className="space-y-2 rounded bg-muted/50 p-3">
                                                <div className="text-xs font-semibold">
                                                    Catat pembayaran
                                                </div>
                                                <div className="flex gap-2">
                                                    <Input
                                                        aria-label={`Pembayaran ${row.document_number}`}
                                                        inputMode="decimal"
                                                        placeholder="Nominal pembayaran"
                                                        value={
                                                            paymentDrafts[
                                                                row.id
                                                            ] ?? ''
                                                        }
                                                        onChange={(event) =>
                                                            setPaymentDrafts(
                                                                (current) => ({
                                                                    ...current,
                                                                    [row.id]:
                                                                        event
                                                                            .target
                                                                            .value,
                                                                }),
                                                            )
                                                        }
                                                    />
                                                    <Button
                                                        type="button"
                                                        disabled={
                                                            Number(
                                                                paymentDrafts[
                                                                    row.id
                                                                ],
                                                            ) <= 0
                                                        }
                                                        onClick={() =>
                                                            router.post(
                                                                `/${teamSlug}/inventory-operations/purchase-invoices/${row.id}/payments`,
                                                                {
                                                                    paid_at:
                                                                        new Date()
                                                                            .toISOString()
                                                                            .slice(
                                                                                0,
                                                                                10,
                                                                            ),
                                                                    amount: paymentDrafts[
                                                                        row.id
                                                                    ],
                                                                    method: 'bank_transfer',
                                                                },
                                                                {
                                                                    preserveScroll: true,
                                                                },
                                                            )
                                                        }
                                                    >
                                                        Bayar
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="space-y-2 rounded bg-muted/50 p-3">
                                                <div className="text-xs font-semibold">
                                                    Alokasikan landed cost
                                                </div>
                                                <div className="grid gap-2 sm:grid-cols-[1fr_120px_auto]">
                                                    <Input
                                                        aria-label={`Deskripsi landed cost ${row.document_number}`}
                                                        placeholder="Ongkir atau bea masuk"
                                                        value={
                                                            landedDraft.description
                                                        }
                                                        onChange={(event) =>
                                                            setLandedCostDrafts(
                                                                (current) => ({
                                                                    ...current,
                                                                    [row.id]: {
                                                                        ...landedDraft,
                                                                        description:
                                                                            event
                                                                                .target
                                                                                .value,
                                                                    },
                                                                }),
                                                            )
                                                        }
                                                    />
                                                    <Input
                                                        aria-label={`Nilai landed cost ${row.document_number}`}
                                                        inputMode="decimal"
                                                        placeholder="Nominal"
                                                        value={
                                                            landedDraft.amount
                                                        }
                                                        onChange={(event) =>
                                                            setLandedCostDrafts(
                                                                (current) => ({
                                                                    ...current,
                                                                    [row.id]: {
                                                                        ...landedDraft,
                                                                        amount: event
                                                                            .target
                                                                            .value,
                                                                    },
                                                                }),
                                                            )
                                                        }
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        disabled={
                                                            !landedDraft.description ||
                                                            Number(
                                                                landedDraft.amount,
                                                            ) <= 0
                                                        }
                                                        onClick={() =>
                                                            router.post(
                                                                `/${teamSlug}/inventory-operations/purchase-invoices/${row.id}/landed-costs`,
                                                                {
                                                                    description:
                                                                        landedDraft.description,
                                                                    amount: landedDraft.amount,
                                                                    allocation_method:
                                                                        landedDraft.method,
                                                                },
                                                                {
                                                                    preserveScroll: true,
                                                                },
                                                            )
                                                        }
                                                    >
                                                        Alokasikan
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </CardContent>
                </Card>
                <div className="grid gap-4 xl:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Hash className="size-4" /> Serial Number
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {serials.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    Aktifkan pelacakan serial pada produk, lalu
                                    terima barang melalui PO.
                                </p>
                            ) : (
                                serials.map((product) => (
                                    <div
                                        key={product.id}
                                        className="rounded-md border p-3"
                                    >
                                        <strong className="text-sm">
                                            {product.name} ({product.sku})
                                        </strong>
                                        <ul className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
                                            {product.inventory_serials.map(
                                                (serial) => (
                                                    <li
                                                        key={serial.id}
                                                        className="rounded bg-muted p-2"
                                                    >
                                                        <span className="font-medium">
                                                            {
                                                                serial.serial_number
                                                            }
                                                        </span>
                                                        <span className="block text-muted-foreground">
                                                            {serial.status}
                                                            {serial.bin
                                                                ? ` · ${serial.bin.name}`
                                                                : ''}
                                                        </span>
                                                    </li>
                                                ),
                                            )}
                                        </ul>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                Riwayat Retur Supplier
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {supplierReturns.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    Belum ada retur supplier.
                                </p>
                            ) : (
                                supplierReturns.map((row) => (
                                    <div
                                        key={row.id}
                                        className="flex flex-wrap justify-between gap-2 rounded border p-3 text-sm"
                                    >
                                        <span>
                                            {row.return_number} ·{' '}
                                            {row.supplier.name}
                                        </span>
                                        <strong>{currency(row.total)}</strong>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">
                            Batch Aktif & Kedaluwarsa
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {expiringBatches.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                Belum ada stok yang dilacak per batch.
                            </p>
                        ) : (
                            expiringBatches.map((product) => (
                                <div
                                    key={product.id}
                                    className="rounded-lg border p-3"
                                >
                                    <strong className="text-sm">
                                        {product.name}
                                    </strong>
                                    <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                        {product.inventory_batches.map(
                                            (batch) => (
                                                <div
                                                    key={batch.id}
                                                    className="rounded-md bg-muted p-2 text-xs"
                                                >
                                                    <div className="font-semibold">
                                                        {batch.batch_number}
                                                    </div>
                                                    <div>
                                                        {batch.quantity}{' '}
                                                        {product.base_unit}
                                                    </div>
                                                    <div className="text-muted-foreground">
                                                        {batch.expires_at
                                                            ? `Kedaluwarsa ${new Date(batch.expires_at).toLocaleDateString('id-ID')}`
                                                            : 'Tanpa tanggal kedaluwarsa'}
                                                    </div>
                                                </div>
                                            ),
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">
                            Stok Opname Baru
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form
                            className="space-y-3"
                            onSubmit={(e) => {
                                e.preventDefault();
                                opname.post(
                                    `/${teamSlug}/inventory-operations/stock-opnames`,
                                    { onSuccess: () => opname.reset() },
                                );
                            }}
                        >
                            {opname.data.items.map((item, index) => (
                                <div
                                    key={index}
                                    className="grid gap-2 sm:grid-cols-[1fr_120px]"
                                >
                                    <select
                                        className="h-9 rounded-md border bg-background px-3 text-sm"
                                        value={item.product_id}
                                        onChange={(e) => {
                                            const product = products.find(
                                                (row) =>
                                                    String(row.id) ===
                                                    e.target.value,
                                            );
                                            opname.setData(
                                                'items',
                                                opname.data.items.map(
                                                    (row, i) =>
                                                        i === index
                                                            ? {
                                                                  ...row,
                                                                  product_id:
                                                                      e.target
                                                                          .value,
                                                                  physical_qty:
                                                                      product?.stock ??
                                                                      0,
                                                              }
                                                            : row,
                                                ),
                                            );
                                        }}
                                    >
                                        <option value="">Produk</option>
                                        {products.map((row) => (
                                            <option key={row.id} value={row.id}>
                                                {row.name} (sistem: {row.stock})
                                            </option>
                                        ))}
                                    </select>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={item.physical_qty}
                                        onChange={(e) =>
                                            opname.setData(
                                                'items',
                                                opname.data.items.map(
                                                    (row, i) =>
                                                        i === index
                                                            ? {
                                                                  ...row,
                                                                  physical_qty:
                                                                      Number(
                                                                          e
                                                                              .target
                                                                              .value,
                                                                      ),
                                                              }
                                                            : row,
                                                ),
                                            )
                                        }
                                    />
                                </div>
                            ))}
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={addOpnameItem}
                                >
                                    Tambah Item
                                </Button>
                                <Button disabled={opname.processing}>
                                    <ClipboardCheck /> Selesaikan Opname
                                </Button>
                            </div>
                        </form>
                        <div className="mt-5 space-y-2">
                            {stockOpnames.map((row) => (
                                <div
                                    key={row.id}
                                    className="flex justify-between rounded border p-2 text-sm"
                                >
                                    <span>{row.opname_number}</span>
                                    <span>
                                        {row.items.length} produk · selisih{' '}
                                        {row.items.reduce(
                                            (sum, item) =>
                                                sum + item.difference,
                                            0,
                                        )}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
