import { Head, router, useForm } from '@inertiajs/react';
import { ArrowRight, PackageCheck } from 'lucide-react';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type Batch = {
    id: number;
    batch_number: string;
    expires_at: string | null;
    quantity: number;
    location_balances: {
        warehouse_bin_id: number;
        quantity: number;
        bin: { id: number; name: string; code: string };
    }[];
};
type Product = {
    id: number;
    name: string;
    sku: string;
    stock: number;
    tracks_batches: boolean;
    tracks_serials: boolean;
    inventory_batches: Batch[];
    inventory_serials: {
        id: number;
        serial_number: string;
    }[];
};
type Team = {
    id: number;
    name: string;
    products: Product[];
    warehouses: {
        id: number;
        name: string;
        bins: { id: number; name: string; code: string }[];
    }[];
};
type TransferFormItem = {
    product_id: string;
    quantity: number;
    batches: {
        inventory_batch_id: number;
        warehouse_bin_id: number | null;
        to_warehouse_bin_id: number | null;
        quantity: number;
    }[];
    inventory_serial_ids: number[];
};
type Transfer = {
    id: number;
    transfer_number: string;
    status: string;
    note: string | null;
    from_team: Team;
    to_team: Team;
    items: { id: number; quantity: number; from_product: Product }[];
};

export default function StockTransfers({
    teams,
    transfers,
    canManage,
}: {
    teams: Team[];
    transfers: Transfer[];
    canManage: boolean;
}) {
    const emptyItem = (): TransferFormItem => ({
        product_id: '',
        quantity: 1,
        batches: [],
        inventory_serial_ids: [],
    });
    const form = useForm<{
        from_team_id: string;
        to_team_id: string;
        note: string;
        items: TransferFormItem[];
    }>({
        from_team_id: '',
        to_team_id: '',
        note: '',
        items: [emptyItem()],
    });
    const source = teams.find(
        (team) => String(team.id) === form.data.from_team_id,
    );
    const destination = teams.find(
        (team) => String(team.id) === form.data.to_team_id,
    );
    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        form.transform((data) => ({
            ...data,
            items: data.items.map((item) => ({
                ...item,
                batches: item.batches.filter((batch) => batch.quantity > 0),
            })),
        }));
        form.post('/settings/organization/stock-transfers', {
            onSuccess: () => form.reset(),
        });
    };
    const act = (id: number, action: string) =>
        router.post(
            `/settings/organization/stock-transfers/${id}/${action}`,
            {},
            { preserveScroll: true },
        );

    return (
        <>
            <Head title="Transfer Stok" />
            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="Transfer Stok Antar Toko"
                    description="Audit stok dari permintaan hingga penerimaan."
                />
                {canManage && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                Buat Transfer
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={submit} className="space-y-3">
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <select
                                        className="h-9 rounded-md border bg-background px-3 text-sm"
                                        value={form.data.from_team_id}
                                        onChange={(e) =>
                                            form.setData({
                                                ...form.data,
                                                from_team_id: e.target.value,
                                                items: [emptyItem()],
                                            })
                                        }
                                    >
                                        <option value="">Toko asal</option>
                                        {teams.map((team) => (
                                            <option
                                                key={team.id}
                                                value={team.id}
                                            >
                                                {team.name}
                                            </option>
                                        ))}
                                    </select>
                                    <select
                                        className="h-9 rounded-md border bg-background px-3 text-sm"
                                        value={form.data.to_team_id}
                                        onChange={(e) =>
                                            form.setData(
                                                'to_team_id',
                                                e.target.value,
                                            )
                                        }
                                    >
                                        <option value="">Toko tujuan</option>
                                        {teams
                                            .filter(
                                                (team) =>
                                                    String(team.id) !==
                                                    form.data.from_team_id,
                                            )
                                            .map((team) => (
                                                <option
                                                    key={team.id}
                                                    value={team.id}
                                                >
                                                    {team.name}
                                                </option>
                                            ))}
                                    </select>
                                </div>
                                {form.data.items.map((item, index) => (
                                    <div
                                        key={index}
                                        className="grid grid-cols-[1fr_100px_auto] gap-2"
                                    >
                                        <select
                                            className="h-9 rounded-md border bg-background px-3 text-sm"
                                            value={item.product_id}
                                            onChange={(e) => {
                                                const product =
                                                    source?.products.find(
                                                        (row) =>
                                                            String(row.id) ===
                                                            e.target.value,
                                                    );
                                                form.setData(
                                                    'items',
                                                    form.data.items.map(
                                                        (row, i) =>
                                                            i === index
                                                                ? {
                                                                      ...row,
                                                                      product_id:
                                                                          e
                                                                              .target
                                                                              .value,
                                                                      batches:
                                                                          product?.inventory_batches.map(
                                                                              (
                                                                                  batch,
                                                                              ) => ({
                                                                                  inventory_batch_id:
                                                                                      batch.id,
                                                                                  warehouse_bin_id:
                                                                                      null,
                                                                                  to_warehouse_bin_id:
                                                                                      null,
                                                                                  quantity: 0,
                                                                              }),
                                                                          ) ??
                                                                          [],
                                                                      inventory_serial_ids:
                                                                          [],
                                                                  }
                                                                : row,
                                                    ),
                                                );
                                            }}
                                        >
                                            <option value="">
                                                Pilih produk
                                            </option>
                                            {source?.products.map((product) => (
                                                <option
                                                    key={product.id}
                                                    value={product.id}
                                                >
                                                    {product.name} (
                                                    {product.stock})
                                                </option>
                                            ))}
                                        </select>
                                        <Input
                                            type="number"
                                            min={1}
                                            value={item.quantity}
                                            onChange={(e) =>
                                                form.setData(
                                                    'items',
                                                    form.data.items.map(
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
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() =>
                                                form.setData(
                                                    'items',
                                                    form.data.items.filter(
                                                        (_, i) => i !== index,
                                                    ),
                                                )
                                            }
                                        >
                                            Hapus
                                        </Button>
                                        {(() => {
                                            const product =
                                                source?.products.find(
                                                    (row) =>
                                                        String(row.id) ===
                                                        item.product_id,
                                                );

                                            if (!product) {
                                                return null;
                                            }

                                            return (
                                                <div className="col-span-full space-y-3 rounded-md border bg-muted/30 p-3">
                                                    {product.tracks_batches && (
                                                        <fieldset className="space-y-2">
                                                            <legend className="text-xs font-semibold">
                                                                Alokasi batch
                                                                sumber dan bin
                                                                tujuan
                                                            </legend>
                                                            {product.inventory_batches.map(
                                                                (batch) => {
                                                                    const allocation =
                                                                        item.batches.find(
                                                                            (
                                                                                row,
                                                                            ) =>
                                                                                row.inventory_batch_id ===
                                                                                batch.id,
                                                                        );

                                                                    return (
                                                                        <div
                                                                            key={
                                                                                batch.id
                                                                            }
                                                                            className="grid gap-2 sm:grid-cols-[1fr_100px_1fr_1fr]"
                                                                        >
                                                                            <div className="text-sm">
                                                                                <strong>
                                                                                    {
                                                                                        batch.batch_number
                                                                                    }
                                                                                </strong>
                                                                                <span className="block text-xs text-muted-foreground">
                                                                                    tersedia{' '}
                                                                                    {
                                                                                        batch.quantity
                                                                                    }
                                                                                </span>
                                                                            </div>
                                                                            <Input
                                                                                aria-label={`Jumlah batch ${batch.batch_number}`}
                                                                                type="number"
                                                                                min={
                                                                                    0
                                                                                }
                                                                                max={
                                                                                    batch.quantity
                                                                                }
                                                                                value={
                                                                                    allocation?.quantity ??
                                                                                    0
                                                                                }
                                                                                onChange={(
                                                                                    event,
                                                                                ) =>
                                                                                    form.setData(
                                                                                        'items',
                                                                                        form.data.items.map(
                                                                                            (
                                                                                                current,
                                                                                                itemIndex,
                                                                                            ) =>
                                                                                                itemIndex ===
                                                                                                index
                                                                                                    ? {
                                                                                                          ...current,
                                                                                                          batches:
                                                                                                              current.batches.map(
                                                                                                                  (
                                                                                                                      row,
                                                                                                                  ) =>
                                                                                                                      row.inventory_batch_id ===
                                                                                                                      batch.id
                                                                                                                          ? {
                                                                                                                                ...row,
                                                                                                                                quantity:
                                                                                                                                    Number(
                                                                                                                                        event
                                                                                                                                            .target
                                                                                                                                            .value,
                                                                                                                                    ),
                                                                                                                            }
                                                                                                                          : row,
                                                                                                              ),
                                                                                                      }
                                                                                                    : current,
                                                                                        ),
                                                                                    )
                                                                                }
                                                                            />
                                                                            <select
                                                                                aria-label={`Bin sumber batch ${batch.batch_number}`}
                                                                                className="h-9 rounded-md border bg-background px-3 text-sm"
                                                                                value={
                                                                                    allocation?.warehouse_bin_id ??
                                                                                    ''
                                                                                }
                                                                                onChange={(
                                                                                    event,
                                                                                ) =>
                                                                                    form.setData(
                                                                                        'items',
                                                                                        form.data.items.map(
                                                                                            (
                                                                                                current,
                                                                                                itemIndex,
                                                                                            ) =>
                                                                                                itemIndex ===
                                                                                                index
                                                                                                    ? {
                                                                                                          ...current,
                                                                                                          batches:
                                                                                                              current.batches.map(
                                                                                                                  (
                                                                                                                      row,
                                                                                                                  ) =>
                                                                                                                      row.inventory_batch_id ===
                                                                                                                      batch.id
                                                                                                                          ? {
                                                                                                                                ...row,
                                                                                                                                warehouse_bin_id:
                                                                                                                                    event
                                                                                                                                        .target
                                                                                                                                        .value
                                                                                                                                        ? Number(
                                                                                                                                              event
                                                                                                                                                  .target
                                                                                                                                                  .value,
                                                                                                                                          )
                                                                                                                                        : null,
                                                                                                                            }
                                                                                                                          : row,
                                                                                                              ),
                                                                                                      }
                                                                                                    : current,
                                                                                        ),
                                                                                    )
                                                                                }
                                                                            >
                                                                                <option value="">
                                                                                    Bin
                                                                                    sumber
                                                                                    otomatis
                                                                                </option>
                                                                                {batch.location_balances.map(
                                                                                    (
                                                                                        balance,
                                                                                    ) => (
                                                                                        <option
                                                                                            key={
                                                                                                balance.warehouse_bin_id
                                                                                            }
                                                                                            value={
                                                                                                balance.warehouse_bin_id
                                                                                            }
                                                                                        >
                                                                                            {
                                                                                                balance
                                                                                                    .bin
                                                                                                    .name
                                                                                            }{' '}
                                                                                            (
                                                                                            {
                                                                                                balance.quantity
                                                                                            }

                                                                                            )
                                                                                        </option>
                                                                                    ),
                                                                                )}
                                                                            </select>
                                                                            <select
                                                                                aria-label={`Bin tujuan batch ${batch.batch_number}`}
                                                                                className="h-9 rounded-md border bg-background px-3 text-sm"
                                                                                value={
                                                                                    allocation?.to_warehouse_bin_id ??
                                                                                    ''
                                                                                }
                                                                                onChange={(
                                                                                    event,
                                                                                ) =>
                                                                                    form.setData(
                                                                                        'items',
                                                                                        form.data.items.map(
                                                                                            (
                                                                                                current,
                                                                                                itemIndex,
                                                                                            ) =>
                                                                                                itemIndex ===
                                                                                                index
                                                                                                    ? {
                                                                                                          ...current,
                                                                                                          batches:
                                                                                                              current.batches.map(
                                                                                                                  (
                                                                                                                      row,
                                                                                                                  ) =>
                                                                                                                      row.inventory_batch_id ===
                                                                                                                      batch.id
                                                                                                                          ? {
                                                                                                                                ...row,
                                                                                                                                to_warehouse_bin_id:
                                                                                                                                    event
                                                                                                                                        .target
                                                                                                                                        .value
                                                                                                                                        ? Number(
                                                                                                                                              event
                                                                                                                                                  .target
                                                                                                                                                  .value,
                                                                                                                                          )
                                                                                                                                        : null,
                                                                                                                            }
                                                                                                                          : row,
                                                                                                              ),
                                                                                                      }
                                                                                                    : current,
                                                                                        ),
                                                                                    )
                                                                                }
                                                                            >
                                                                                <option value="">
                                                                                    Bin
                                                                                    tujuan
                                                                                    default
                                                                                </option>
                                                                                {destination?.warehouses.flatMap(
                                                                                    (
                                                                                        warehouse,
                                                                                    ) =>
                                                                                        warehouse.bins.map(
                                                                                            (
                                                                                                bin,
                                                                                            ) => (
                                                                                                <option
                                                                                                    key={
                                                                                                        bin.id
                                                                                                    }
                                                                                                    value={
                                                                                                        bin.id
                                                                                                    }
                                                                                                >
                                                                                                    {
                                                                                                        warehouse.name
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
                                                                        </div>
                                                                    );
                                                                },
                                                            )}
                                                        </fieldset>
                                                    )}
                                                    {product.tracks_serials && (
                                                        <fieldset>
                                                            <legend className="text-xs font-semibold">
                                                                Serial yang
                                                                dipindahkan
                                                            </legend>
                                                            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                                                {product.inventory_serials.map(
                                                                    (
                                                                        serial,
                                                                    ) => (
                                                                        <label
                                                                            key={
                                                                                serial.id
                                                                            }
                                                                            className="flex min-h-11 items-center gap-2 rounded border bg-background px-3 text-sm"
                                                                        >
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={item.inventory_serial_ids.includes(
                                                                                    serial.id,
                                                                                )}
                                                                                onChange={(
                                                                                    event,
                                                                                ) =>
                                                                                    form.setData(
                                                                                        'items',
                                                                                        form.data.items.map(
                                                                                            (
                                                                                                current,
                                                                                                itemIndex,
                                                                                            ) =>
                                                                                                itemIndex ===
                                                                                                index
                                                                                                    ? {
                                                                                                          ...current,
                                                                                                          inventory_serial_ids:
                                                                                                              event
                                                                                                                  .target
                                                                                                                  .checked
                                                                                                                  ? [
                                                                                                                        ...current.inventory_serial_ids,
                                                                                                                        serial.id,
                                                                                                                    ]
                                                                                                                  : current.inventory_serial_ids.filter(
                                                                                                                        (
                                                                                                                            id,
                                                                                                                        ) =>
                                                                                                                            id !==
                                                                                                                            serial.id,
                                                                                                                    ),
                                                                                                      }
                                                                                                    : current,
                                                                                        ),
                                                                                    )
                                                                                }
                                                                            />
                                                                            {
                                                                                serial.serial_number
                                                                            }
                                                                        </label>
                                                                    ),
                                                                )}
                                                            </div>
                                                        </fieldset>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                ))}
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() =>
                                        form.setData('items', [
                                            ...form.data.items,
                                            emptyItem(),
                                        ])
                                    }
                                >
                                    Tambah Item
                                </Button>
                                <Input
                                    placeholder="Catatan (opsional)"
                                    value={form.data.note}
                                    onChange={(e) =>
                                        form.setData('note', e.target.value)
                                    }
                                />
                                {Object.values(form.errors).map((error) => (
                                    <p
                                        key={error}
                                        className="text-sm text-destructive"
                                    >
                                        {error}
                                    </p>
                                ))}
                                <Button disabled={form.processing}>
                                    <PackageCheck /> Buat Permintaan
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                )}
                <div className="space-y-3">
                    {transfers.map((transfer) => (
                        <Card key={transfer.id} className="gap-3 py-4">
                            <CardContent>
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <strong>
                                            {transfer.transfer_number}
                                        </strong>
                                        <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                                            {transfer.from_team.name}
                                            <ArrowRight className="size-3" />
                                            {transfer.to_team.name}
                                        </div>
                                    </div>
                                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                                        {transfer.status.replace('_', ' ')}
                                    </span>
                                </div>
                                <ul className="mt-3 text-sm">
                                    {transfer.items.map((item) => (
                                        <li key={item.id}>
                                            {item.from_product.name} (
                                            {item.from_product.sku}) ×{' '}
                                            {item.quantity}
                                        </li>
                                    ))}
                                </ul>
                                {canManage && (
                                    <div className="mt-3 flex gap-2">
                                        {transfer.status === 'pending' && (
                                            <Button
                                                size="sm"
                                                onClick={() =>
                                                    act(transfer.id, 'ship')
                                                }
                                            >
                                                Kirim
                                            </Button>
                                        )}
                                        {transfer.status === 'in_transit' && (
                                            <Button
                                                size="sm"
                                                onClick={() =>
                                                    act(transfer.id, 'receive')
                                                }
                                            >
                                                Terima
                                            </Button>
                                        )}
                                        {['pending', 'in_transit'].includes(
                                            transfer.status,
                                        ) && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() =>
                                                    act(transfer.id, 'cancel')
                                                }
                                            >
                                                Batalkan
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </>
    );
}
