import { Head, router, useForm } from '@inertiajs/react';
import { Armchair, Plus } from 'lucide-react';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type DiningTable = {
    id: number;
    name: string;
    capacity: number;
    status: 'available' | 'occupied' | 'reserved';
    transactions: { id: number; invoice_number: string }[];
};
export default function DiningTables({
    teamSlug,
    tables,
}: {
    teamSlug: string;
    tables: DiningTable[];
}) {
    const form = useForm({ name: '', capacity: 2, status: 'available' });
    const colors = {
        available: 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20',
        occupied: 'border-amber-300 bg-amber-50 dark:bg-amber-950/20',
        reserved: 'border-blue-300 bg-blue-50 dark:bg-blue-950/20',
    };
    const toggleReserve = (table: DiningTable) =>
        router.put(
            `/${teamSlug}/dining-tables/${table.id}`,
            {
                name: table.name,
                capacity: table.capacity,
                status: table.status === 'reserved' ? 'available' : 'reserved',
            },
            { preserveScroll: true },
        );

    return (
        <>
            <Head title="Manajemen Meja" />
            <div className="space-y-6">
                <Heading
                    title="Manajemen Meja"
                    description="Pesanan belum lunas menandai meja terisi hingga pembayaran selesai."
                />
                <form
                    className="flex flex-wrap gap-2"
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.post(`/${teamSlug}/dining-tables`, {
                            onSuccess: () => form.reset(),
                        });
                    }}
                >
                    <Input
                        className="max-w-52"
                        placeholder="Nama / nomor meja"
                        value={form.data.name}
                        onChange={(e) => form.setData('name', e.target.value)}
                    />
                    <Input
                        className="max-w-28"
                        type="number"
                        min={1}
                        value={form.data.capacity}
                        onChange={(e) =>
                            form.setData('capacity', Number(e.target.value))
                        }
                    />
                    <Button>
                        <Plus /> Tambah Meja
                    </Button>
                </form>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {tables.map((table) => (
                        <Card key={table.id} className={colors[table.status]}>
                            <CardContent className="text-center">
                                <Armchair className="mx-auto mb-2 size-8" />
                                <h2 className="font-semibold">{table.name}</h2>
                                <p className="text-sm text-muted-foreground">
                                    {table.capacity} kursi · {table.status}
                                </p>
                                {table.transactions[0] && (
                                    <p className="mt-2 text-xs">
                                        {table.transactions[0].invoice_number}
                                    </p>
                                )}
                                {table.status !== 'occupied' && (
                                    <Button
                                        className="mt-3"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => toggleReserve(table)}
                                    >
                                        {table.status === 'reserved'
                                            ? 'Batalkan Reservasi'
                                            : 'Reservasi'}
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </>
    );
}
