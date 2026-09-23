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
        <div className="min-h-dvh bg-[#f1eee5] font-sans text-[#18231e] dark:bg-[#101214] dark:text-[#F4F1E8]">
            <header className="border-b border-[#9aa59f] dark:border-[#40474E] dark:bg-[#15181B]">
                <div className="mx-auto flex min-h-20 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
                    <Link
                        href={home()}
                        className="inline-flex min-h-11 items-center gap-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#123c30] dark:focus-visible:outline-[#FF6B3D]"
                    >
                        <span className="flex size-10 items-center justify-center rounded-md bg-[#123c30] text-[#f1eee5] dark:bg-[#F4F1E8] dark:text-[#101214]">
                            <ShoppingCart
                                className="size-5"
                                aria-hidden="true"
                            />
                        </span>
                        <span className="text-lg font-semibold tracking-tight">
                            Kasir
                            <span className="text-[#b9472d] dark:text-[#FF6B3D]">
                                Pro
                            </span>
                        </span>
                    </Link>

                    <ThemeToggle
                        compact
                        className="bg-[#deddd5] dark:bg-[#1C2024] [&_button]:h-11 [&_button]:w-11"
                    />
                </div>
            </header>

            <main className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[minmax(260px,0.75fr)_minmax(0,1fr)] lg:gap-20 lg:px-8 lg:py-20">
                <section className="lg:pt-8" aria-labelledby="auth-title">
                    <p className="text-sm font-semibold text-[#3f5f51] dark:text-[#AEB4B9]">
                        Akses ruang kerja toko
                    </p>
                    <h1
                        id="auth-title"
                        className="mt-4 max-w-lg text-[clamp(2.25rem,5vw,4.5rem)] leading-[0.98] font-semibold tracking-[-0.05em] text-[#123c30] dark:text-[#F4F1E8]"
                    >
                        {title}
                    </h1>
                    <p className="mt-5 max-w-md text-base leading-7 text-[#53635b] dark:text-[#AEB4B9]">
                        {description}
                    </p>
                    <Link
                        href={home()}
                        className="mt-8 inline-flex min-h-11 items-center text-sm font-semibold underline decoration-[#65756d] underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#123c30] dark:decoration-[#AEB4B9] dark:focus-visible:outline-[#FF6B3D]"
                    >
                        Kembali ke halaman awal
                    </Link>
                </section>

                <section
                    aria-label="Formulir akun"
                    className="self-start border border-[#65756d] bg-[#faf8f1] p-5 shadow-[10px_10px_0_#123c30] sm:p-8 lg:p-10 dark:border-[#68717A] dark:bg-[#1C2024] dark:shadow-[10px_10px_0_#050607] [&_[data-slot=checkbox]]:min-h-5 [&_button]:min-h-11 [&_input]:min-h-12"
                >
                    <div className="mx-auto w-full max-w-md">{children}</div>
                </section>
            </main>

            <footer className="mx-auto flex w-full max-w-6xl px-4 pb-8 text-sm text-[#53635b] sm:px-6 lg:px-8 dark:text-[#AEB4B9]">
                POS · Shift kasir · Stok · Pelanggan · Laporan
            </footer>
        </div>
    );
}
