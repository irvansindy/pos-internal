import { Head, Link, usePage } from '@inertiajs/react';
import { ShoppingCart } from 'lucide-react';
import type { ComponentProps } from 'react';
import ThemeToggle from '@/components/theme-toggle';
import { dashboard, login, register } from '@/routes';

const workday = [
    {
        number: '01',
        title: 'Buka shift',
        description: 'Modal awal masuk ke catatan kasir.',
    },
    {
        number: '02',
        title: 'Layani penjualan',
        description: 'Transaksi dan pembayaran tersimpan pada toko aktif.',
    },
    {
        number: '03',
        title: 'Pantau stok',
        description: 'Setiap perubahan produk meninggalkan riwayat.',
    },
    {
        number: '04',
        title: 'Tutup kas',
        description: 'Kas fisik dibandingkan dengan catatan shift.',
    },
];

type LinkHref = ComponentProps<typeof Link>['href'];

export default function Welcome({
    canRegister = true,
}: {
    canRegister?: boolean;
}) {
    const { auth, currentTeam } = usePage().props;
    const dashboardUrl = currentTeam ? dashboard(currentTeam.slug) : '/';
    const primaryHref = auth.user
        ? dashboardUrl
        : canRegister
          ? register()
          : login();
    const primaryLabel = auth.user
        ? 'Buka dashboard'
        : canRegister
          ? 'Buat akun toko'
          : 'Masuk ke akun';

    return (
        <>
            <Head title="KasirPro" />
            <div className="min-h-dvh bg-[#f1eee5] font-sans text-[#18231e] dark:bg-[#0d1512] dark:text-[#f3f1e9]">
                <header className="border-b border-[#9aa59f] dark:border-[#526158]">
                    <div className="mx-auto flex min-h-20 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
                        <Brand href={auth.user ? dashboardUrl : '/'} />

                        <nav
                            aria-label="Navigasi akun"
                            className="flex items-center gap-2 sm:gap-3 [&_button]:h-11 [&_button]:w-11"
                        >
                            <ThemeToggle
                                compact
                                className="bg-[#deddd5] dark:bg-[#26322c]"
                            />
                            {auth.user ? (
                                <ActionLink href={dashboardUrl}>
                                    Dashboard
                                </ActionLink>
                            ) : (
                                <>
                                    <Link
                                        href={login()}
                                        className="inline-flex min-h-11 items-center px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#123c30] dark:focus-visible:outline-[#f3f1e9]"
                                    >
                                        Masuk
                                    </Link>
                                    {canRegister && (
                                        <ActionLink href={register()}>
                                            Daftar
                                        </ActionLink>
                                    )}
                                </>
                            )}
                        </nav>
                    </div>
                </header>

                <main className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,0.75fr)] lg:items-center lg:gap-20 lg:px-10 lg:py-24">
                    <section aria-labelledby="welcome-title">
                        <p className="mb-5 text-sm font-semibold text-[#3f5f51] dark:text-[#a9c0b3]">
                            POS untuk kerja toko sehari-hari
                        </p>
                        <h1
                            id="welcome-title"
                            className="max-w-3xl text-[clamp(2.75rem,7vw,5.75rem)] leading-[0.96] font-semibold tracking-[-0.055em] text-[#123c30] dark:text-[#edf2ec]"
                        >
                            Kasir jalan.
                            <span className="mt-2 block text-[#b9472d] dark:text-[#f08a68]">
                                Catatan ikut rapi.
                            </span>
                        </h1>
                        <p className="mt-7 max-w-xl text-base leading-7 text-[#46564e] sm:text-lg sm:leading-8 dark:text-[#b9c5be]">
                            Buka shift, layani transaksi, awasi stok, lalu
                            cocokkan kas di akhir hari. Semua aktivitas tetap
                            terhubung ke toko dan pengguna yang menjalankannya.
                        </p>

                        <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                            <Link
                                href={primaryHref}
                                className="inline-flex min-h-12 items-center justify-center rounded-md bg-[#b9472d] px-6 text-sm font-semibold text-white hover:bg-[#963820] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#123c30] dark:focus-visible:outline-[#f3f1e9]"
                            >
                                {primaryLabel}
                            </Link>
                            {!auth.user && canRegister && (
                                <Link
                                    href={login()}
                                    className="inline-flex min-h-12 items-center justify-center rounded-md border border-[#65756d] px-6 text-sm font-semibold hover:bg-[#e4e2da] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#123c30] dark:border-[#7d8e85] dark:hover:bg-[#1a2520] dark:focus-visible:outline-[#f3f1e9]"
                                >
                                    Saya sudah punya akun
                                </Link>
                            )}
                        </div>

                        <p className="mt-10 border-t border-[#9aa59f] pt-5 text-sm text-[#53635b] dark:border-[#526158] dark:text-[#a9b7af]">
                            POS · Shift kasir · Stok · Pelanggan · Laporan
                        </p>
                    </section>

                    <WorkdayPanel />
                </main>

                <footer className="border-t border-[#9aa59f] dark:border-[#526158]">
                    <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-5 text-sm text-[#53635b] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10 dark:text-[#a9b7af]">
                        <span>KasirPro</span>
                        <span>
                            © {new Date().getFullYear()} Sistem operasional toko
                        </span>
                    </div>
                </footer>
            </div>
        </>
    );
}

function Brand({ href }: { href: LinkHref }) {
    return (
        <Link
            href={href}
            className="inline-flex min-h-11 shrink-0 items-center gap-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#123c30] dark:focus-visible:outline-[#f3f1e9]"
        >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-[#123c30] text-[#f1eee5] dark:bg-[#edf2ec] dark:text-[#123c30]">
                <ShoppingCart className="size-5" aria-hidden="true" />
            </span>
            <span className="hidden text-lg font-semibold tracking-tight sm:inline">
                Kasir
                <span className="text-[#b9472d] dark:text-[#f08a68]">Pro</span>
            </span>
        </Link>
    );
}

function ActionLink({ href, children }: { href: LinkHref; children: string }) {
    return (
        <Link
            href={href}
            className="inline-flex min-h-11 items-center rounded-md bg-[#123c30] px-4 text-sm font-semibold text-white hover:bg-[#0b2d23] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b9472d] dark:bg-[#edf2ec] dark:text-[#123c30] dark:hover:bg-white"
        >
            {children}
        </Link>
    );
}

function WorkdayPanel() {
    return (
        <section
            aria-labelledby="workday-title"
            className="border border-[#65756d] bg-[#faf8f1] shadow-[12px_12px_0_#123c30] dark:border-[#7d8e85] dark:bg-[#131e19] dark:shadow-[12px_12px_0_#b9472d]"
        >
            <div className="flex items-end justify-between gap-4 border-b border-[#65756d] px-5 py-5 sm:px-7 dark:border-[#7d8e85]">
                <div>
                    <p className="text-sm text-[#53635b] dark:text-[#a9b7af]">
                        Satu hari kerja
                    </p>
                    <h2
                        id="workday-title"
                        className="mt-1 text-2xl font-semibold tracking-tight text-[#123c30] dark:text-[#edf2ec]"
                    >
                        Jejak operasional toko
                    </h2>
                </div>
                <span className="hidden text-sm font-semibold text-[#b9472d] sm:block dark:text-[#f08a68]">
                    4 tahap
                </span>
            </div>

            <ol>
                {workday.map((step) => (
                    <li
                        key={step.number}
                        className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-4 border-b border-[#b8c0bb] px-5 py-5 last:border-b-0 sm:px-7 dark:border-[#3b4942]"
                    >
                        <span className="pt-0.5 text-sm font-semibold text-[#b9472d] dark:text-[#f08a68]">
                            {step.number}
                        </span>
                        <div>
                            <h3 className="font-semibold text-[#18231e] dark:text-[#edf2ec]">
                                {step.title}
                            </h3>
                            <p className="mt-1 text-sm leading-6 text-[#53635b] dark:text-[#a9b7af]">
                                {step.description}
                            </p>
                        </div>
                    </li>
                ))}
            </ol>
        </section>
    );
}
