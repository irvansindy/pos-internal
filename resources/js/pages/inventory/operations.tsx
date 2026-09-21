import { Head, router, useForm } from '@inertiajs/react';
import { ClipboardCheck, PackagePlus, Truck } from 'lucide-react';
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

export default function InventoryOperations({
    teamSlug,
    products,
    suppliers,
    purchaseOrders,
    stockOpnames,
}: {
    teamSlug: string;
    products: Product[];
    suppliers: Supplier[];
    purchaseOrders: PO[];
    stockOpnames: Opname[];
}) {
    const supplier = useForm({ name: '', phone: '', email: '', address: '' });
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
            },
            { preserveScroll: true },
        );

    return (
        <>
            <Head title="PO & Stok Opname" />
            <div className="space-y-6">
                <Heading
                    title="Purchase Order & Stok Opname"
                    description="Penerimaan dan koreksi stok selalu menghasilkan movement yang dapat diaudit."
                />
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
                                <ul className="mt-2 text-sm">
                                    {order.items.map((item) => (
                                        <li key={item.id}>
                                            {item.product.name}:{' '}
                                            {item.received_quantity}/
                                            {item.quantity}
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
