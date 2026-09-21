import { Head, router, useForm } from '@inertiajs/react';
import { ArrowRight, PackageCheck } from 'lucide-react';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type Product = { id: number; name: string; sku: string; stock: number };
type Team = { id: number; name: string; products: Product[] };
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
    const form = useForm({
        from_team_id: '',
        to_team_id: '',
        note: '',
        items: [{ product_id: '', quantity: 1 }],
    });
    const source = teams.find(
        (team) => String(team.id) === form.data.from_team_id,
    );
    const submit = (event: React.FormEvent) => {
        event.preventDefault();
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
                                                items: [
                                                    {
                                                        product_id: '',
                                                        quantity: 1,
                                                    },
                                                ],
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
                                            onChange={(e) =>
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
                                                                  }
                                                                : row,
                                                    ),
                                                )
                                            }
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
                                    </div>
                                ))}
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() =>
                                        form.setData('items', [
                                            ...form.data.items,
                                            { product_id: '', quantity: 1 },
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
