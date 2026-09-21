import { Head, useForm } from '@inertiajs/react';
import { UserPlus } from 'lucide-react';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type Customer = {
    id: number;
    name: string;
    phone: string;
    email: string | null;
    points_balance: number;
    transactions_count: number;
};
export default function Customers({
    teamSlug,
    customers,
    loyalty,
}: {
    teamSlug: string;
    customers: { data: Customer[] };
    loyalty: { spendPerPoint: number; pointValue: number };
}) {
    const form = useForm({ name: '', phone: '', email: '' });

    return (
        <>
            <Head title="Pelanggan & Loyalti" />
            <div className="space-y-6">
                <Heading
                    title="Pelanggan & Loyalti"
                    description={`1 poin per Rp${loyalty.spendPerPoint.toLocaleString('id-ID')}; nilai tukar Rp${loyalty.pointValue.toLocaleString('id-ID')} per poin.`}
                />
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">
                            Tambah Pelanggan
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form
                            className="grid gap-3 md:grid-cols-4"
                            onSubmit={(e) => {
                                e.preventDefault();
                                form.post(`/${teamSlug}/customers`, {
                                    onSuccess: () => form.reset(),
                                });
                            }}
                        >
                            <Input
                                placeholder="Nama"
                                value={form.data.name}
                                onChange={(e) =>
                                    form.setData('name', e.target.value)
                                }
                            />
                            <Input
                                placeholder="Nomor HP"
                                value={form.data.phone}
                                onChange={(e) =>
                                    form.setData('phone', e.target.value)
                                }
                            />
                            <Input
                                type="email"
                                placeholder="Email"
                                value={form.data.email}
                                onChange={(e) =>
                                    form.setData('email', e.target.value)
                                }
                            />
                            <Button disabled={form.processing}>
                                <UserPlus /> Tambah
                            </Button>
                        </form>
                        {Object.values(form.errors).map((error) => (
                            <p
                                key={error}
                                className="mt-2 text-sm text-destructive"
                            >
                                {error}
                            </p>
                        ))}
                    </CardContent>
                </Card>
                <Card>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left">
                                        <th className="py-3">Pelanggan</th>
                                        <th>Kontak</th>
                                        <th>Transaksi</th>
                                        <th className="text-right">
                                            Saldo Poin
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {customers.data.map((customer) => (
                                        <tr
                                            key={customer.id}
                                            className="border-b"
                                        >
                                            <td className="py-3 font-medium">
                                                {customer.name}
                                            </td>
                                            <td>
                                                {customer.phone}
                                                <br />
                                                <span className="text-xs text-muted-foreground">
                                                    {customer.email}
                                                </span>
                                            </td>
                                            <td>
                                                {customer.transactions_count}
                                            </td>
                                            <td className="text-right font-semibold">
                                                {customer.points_balance.toLocaleString(
                                                    'id-ID',
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
