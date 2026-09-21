import { Link } from '@inertiajs/react';
import { ShoppingCart } from 'lucide-react';
import ThemeToggle from '@/components/theme-toggle';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div className="min-h-dvh bg-[#f1eee5] font-sans text-[#18231e] dark:bg-[#0d1512] dark:text-[#f3f1e9]">
            <header className="border-b border-[#9aa59f] dark:border-[#526158]">
                <div className="mx-auto flex min-h-20 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
                    <Link
                        href={home()}
                        className="inline-flex min-h-11 items-center gap-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#123c30] dark:focus-visible:outline-[#f3f1e9]"
                    >
                        <span className="flex size-10 items-center justify-center rounded-md bg-[#123c30] text-[#f1eee5] dark:bg-[#edf2ec] dark:text-[#123c30]">
                            <ShoppingCart
                                className="size-5"
                                aria-hidden="true"
                            />
                        </span>
                        <span className="text-lg font-semibold tracking-tight">
                            Kasir
                            <span className="text-[#b9472d] dark:text-[#f08a68]">
                                Pro
                            </span>
                        </span>
                    </Link>

                    <ThemeToggle
                        compact
                        className="bg-[#deddd5] dark:bg-[#26322c] [&_button]:h-11 [&_button]:w-11"
                    />
                </div>
            </header>

            <main className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[minmax(260px,0.75fr)_minmax(0,1fr)] lg:gap-20 lg:px-8 lg:py-20">
                <section className="lg:pt-8" aria-labelledby="auth-title">
                    <p className="text-sm font-semibold text-[#3f5f51] dark:text-[#a9c0b3]">
                        Akses ruang kerja toko
                    </p>
                    <h1
                        id="auth-title"
                        className="mt-4 max-w-lg text-[clamp(2.25rem,5vw,4.5rem)] leading-[0.98] font-semibold tracking-[-0.05em] text-[#123c30] dark:text-[#edf2ec]"
                    >
                        {title}
                    </h1>
                    <p className="mt-5 max-w-md text-base leading-7 text-[#53635b] dark:text-[#a9b7af]">
                        {description}
                    </p>
                    <Link
                        href={home()}
                        className="mt-8 inline-flex min-h-11 items-center text-sm font-semibold underline decoration-[#65756d] underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#123c30] dark:decoration-[#a9b7af] dark:focus-visible:outline-[#f3f1e9]"
                    >
                        Kembali ke halaman awal
                    </Link>
                </section>

                <section
                    aria-label="Formulir akun"
                    className="self-start border border-[#65756d] bg-[#faf8f1] p-5 shadow-[10px_10px_0_#123c30] sm:p-8 lg:p-10 dark:border-[#7d8e85] dark:bg-[#131e19] dark:shadow-[10px_10px_0_#b9472d] [&_button]:min-h-11 [&_input]:min-h-12"
                >
                    <div className="mx-auto w-full max-w-md">{children}</div>
                </section>
            </main>

            <footer className="mx-auto flex w-full max-w-6xl px-4 pb-8 text-sm text-[#53635b] sm:px-6 lg:px-8 dark:text-[#a9b7af]">
                POS · Shift kasir · Stok · Pelanggan · Laporan
            </footer>
        </div>
    );
}
