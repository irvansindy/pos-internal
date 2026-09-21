import { Form, Head } from '@inertiajs/react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { register } from '@/routes';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

type Props = {
    status?: string;
    canResetPassword: boolean;
    canRegister: boolean;
};

const fieldClass =
    'border-[#65756d] bg-white focus-visible:border-[#123c30] focus-visible:ring-[#123c30] dark:border-[#7d8e85] dark:bg-[#0d1512] dark:focus-visible:border-[#edf2ec] dark:focus-visible:ring-[#edf2ec]';

export default function Login({
    status,
    canResetPassword,
    canRegister,
}: Props) {
    return (
        <>
            <Head title="Masuk" />

            {status && (
                <div
                    className="mb-6 border border-[#65756d] bg-[#e4ece6] px-4 py-3 text-sm font-medium text-[#123c30] dark:border-[#7d8e85] dark:bg-[#1d2b24] dark:text-[#dce8e0]"
                    role="status"
                >
                    {status}
                </div>
            )}

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                disableWhileProcessing
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-5">
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    required
                                    autoFocus
                                    autoComplete="email"
                                    placeholder="nama@toko.com"
                                    aria-invalid={Boolean(errors.email)}
                                    aria-describedby={
                                        errors.email ? 'email-error' : undefined
                                    }
                                    className={fieldClass}
                                />
                                <InputError
                                    id="email-error"
                                    message={errors.email}
                                />
                            </div>

                            <div className="grid gap-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <Label htmlFor="password">Kata sandi</Label>
                                    {canResetPassword && (
                                        <TextLink
                                            href={request()}
                                            className="text-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#123c30] dark:focus-visible:outline-[#f3f1e9]"
                                        >
                                            Lupa kata sandi?
                                        </TextLink>
                                    )}
                                </div>
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    required
                                    autoComplete="current-password"
                                    placeholder="Masukkan kata sandi"
                                    aria-invalid={Boolean(errors.password)}
                                    aria-describedby={
                                        errors.password
                                            ? 'password-error'
                                            : undefined
                                    }
                                    className={fieldClass}
                                />
                                <InputError
                                    id="password-error"
                                    message={errors.password}
                                />
                            </div>

                            <div className="flex min-h-11 items-center gap-3">
                                <Checkbox
                                    id="remember"
                                    name="remember"
                                    className="size-5 border-[#65756d] focus-visible:ring-[#123c30] dark:border-[#7d8e85] dark:focus-visible:ring-[#edf2ec]"
                                />
                                <Label htmlFor="remember">Ingat saya</Label>
                            </div>

                            <Button
                                type="submit"
                                className="mt-1 min-h-12 w-full bg-[#b9472d] font-semibold text-white hover:bg-[#963820] focus-visible:border-[#123c30] focus-visible:ring-[#123c30] dark:focus-visible:border-[#edf2ec] dark:focus-visible:ring-[#edf2ec]"
                                disabled={processing}
                                data-test="login-button"
                            >
                                {processing && <Spinner />}
                                {processing ? 'Sedang masuk...' : 'Masuk'}
                            </Button>
                        </div>

                        {canRegister && (
                            <p className="border-t border-[#aab3ae] pt-5 text-sm text-[#53635b] dark:border-[#46544d] dark:text-[#a9b7af]">
                                Belum punya akun?{' '}
                                <TextLink
                                    href={register()}
                                    className="font-semibold text-[#123c30] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#123c30] dark:text-[#edf2ec] dark:focus-visible:outline-[#f3f1e9]"
                                >
                                    Buat akun toko
                                </TextLink>
                            </p>
                        )}
                    </>
                )}
            </Form>
        </>
    );
}

Login.layout = {
    title: 'Masuk dan lanjutkan kerja.',
    description:
        'Gunakan akun yang terhubung ke organisasi dan toko tempat Anda bekerja.',
};
