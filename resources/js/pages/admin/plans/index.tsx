import { Head, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

type Plan = {
    id: number;
    code: string;
    name: string;
    max_stores: number | null;
    max_owners: number | null;
    price_monthly: string | null;
    price_yearly: string | null;
    is_custom: boolean;
    is_active: boolean;
    current_subscriptions_count: number;
};

export default function PlatformPlansIndex({ plans }: { plans: Plan[] }) {
    return (
        <>
            <Head title="Katalog Paket" />
            <div className="space-y-6">
                <Heading
                    title="Katalog paket"
                    description="Harga dan kuota yang menjadi sumber checkout serta pembatasan akun pelanggan."
                />

                {plans.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center text-sm text-muted-foreground">
                            Belum ada paket. Jalankan PlanSeeder untuk membuat
                            katalog awal.
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 xl:grid-cols-2">
                        {plans.map((plan) => (
                            <PlanEditor key={plan.id} plan={plan} />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

function PlanEditor({ plan }: { plan: Plan }) {
    const form = useForm({
        name: plan.name,
        max_stores: plan.max_stores === null ? '' : String(plan.max_stores),
        max_owners: plan.max_owners === null ? '' : String(plan.max_owners),
        price_monthly: plan.price_monthly ?? '',
        price_yearly: plan.price_yearly ?? '',
        is_active: plan.is_active,
        reason: '',
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.transform((data) => ({
            ...data,
            max_stores: data.max_stores || null,
            max_owners: data.max_owners || null,
            price_monthly: data.price_monthly || null,
            price_yearly: data.price_yearly || null,
        }));
        form.put(`/admin/plans/${plan.id}`, {
            preserveScroll: true,
            onSuccess: () => form.reset('reason'),
        });
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <CardTitle className="text-base">{plan.name}</CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Kode {plan.code}, {plan.current_subscriptions_count}{' '}
                            subscription saat ini
                        </p>
                    </div>
                    <span className="rounded-md border px-2 py-1 text-xs font-medium">
                        {plan.is_custom ? 'Custom' : 'Reguler'}
                    </span>
                </div>
            </CardHeader>
            <CardContent>
                <form className="space-y-4" onSubmit={submit}>
                    <Field
                        id={`name-${plan.id}`}
                        label="Nama paket"
                        error={form.errors.name}
                    >
                        <Input
                            id={`name-${plan.id}`}
                            className="h-11"
                            value={form.data.name}
                            onChange={(event) =>
                                form.setData('name', event.target.value)
                            }
                        />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field
                            id={`stores-${plan.id}`}
                            label="Kuota toko"
                            error={form.errors.max_stores}
                        >
                            <Input
                                id={`stores-${plan.id}`}
                                className="h-11"
                                type="number"
                                min={1}
                                placeholder={
                                    plan.is_custom
                                        ? 'Ditetapkan per tenant'
                                        : ''
                                }
                                value={form.data.max_stores}
                                onChange={(event) =>
                                    form.setData(
                                        'max_stores',
                                        event.target.value,
                                    )
                                }
                            />
                        </Field>
                        <Field
                            id={`owners-${plan.id}`}
                            label="Kuota owner"
                            error={form.errors.max_owners}
                        >
                            <Input
                                id={`owners-${plan.id}`}
                                className="h-11"
                                type="number"
                                min={1}
                                placeholder={
                                    plan.is_custom
                                        ? 'Ditetapkan per tenant'
                                        : ''
                                }
                                value={form.data.max_owners}
                                onChange={(event) =>
                                    form.setData(
                                        'max_owners',
                                        event.target.value,
                                    )
                                }
                            />
                        </Field>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field
                            id={`monthly-${plan.id}`}
                            label="Harga bulanan"
                            error={form.errors.price_monthly}
                        >
                            <Input
                                id={`monthly-${plan.id}`}
                                className="h-11"
                                inputMode="numeric"
                                value={form.data.price_monthly}
                                onChange={(event) =>
                                    form.setData(
                                        'price_monthly',
                                        event.target.value,
                                    )
                                }
                            />
                        </Field>
                        <Field
                            id={`yearly-${plan.id}`}
                            label="Harga tahunan"
                            error={form.errors.price_yearly}
                        >
                            <Input
                                id={`yearly-${plan.id}`}
                                className="h-11"
                                inputMode="numeric"
                                value={form.data.price_yearly}
                                onChange={(event) =>
                                    form.setData(
                                        'price_yearly',
                                        event.target.value,
                                    )
                                }
                            />
                        </Field>
                    </div>
                    <div className="flex min-h-11 items-center justify-between gap-4 rounded-md border px-3">
                        <Label htmlFor={`active-${plan.id}`}>
                            Tersedia untuk pelanggan
                        </Label>
                        <Switch
                            id={`active-${plan.id}`}
                            checked={form.data.is_active}
                            onCheckedChange={(checked) =>
                                form.setData('is_active', checked)
                            }
                        />
                    </div>
                    <Field
                        id={`reason-${plan.id}`}
                        label="Alasan perubahan"
                        error={form.errors.reason}
                    >
                        <Textarea
                            id={`reason-${plan.id}`}
                            placeholder="Contoh: penyesuaian harga efektif kuartal berikutnya"
                            value={form.data.reason}
                            onChange={(event) =>
                                form.setData('reason', event.target.value)
                            }
                        />
                    </Field>
                    <Button className="h-11" disabled={form.processing}>
                        {form.processing ? 'Menyimpan...' : 'Simpan Paket'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

function Field({
    id,
    label,
    error,
    children,
}: {
    id: string;
    label: string;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-2">
            <Label htmlFor={id}>{label}</Label>
            {children}
            {error && (
                <p className="text-sm text-destructive" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}
