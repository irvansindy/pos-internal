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
    'border-[#65756d] bg-white focus-visible:border-[#123c30] focus-visible:ring-[#123c30] dark:border-[#68717A] dark:bg-[#15181B] dark:focus-visible:border-[#FF6B3D] dark:focus-visible:ring-[#FF6B3D]';

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
                    className="mb-6 border border-[#65756d] bg-[#e4ece6] px-4 py-3 text-sm font-medium text-[#123c30] dark:border-[#68717A] dark:bg-[#252A2F] dark:text-[#F4F1E8]"
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
                                            className="text-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#123c30] dark:focus-visible:outline-[#FF6B3D]"
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
                                    className="size-5 rounded-[4px] border-[#65756d] bg-transparent shadow-none hover:border-[#b9472d] focus-visible:ring-[#123c30]/30 data-[state=checked]:border-[#b9472d] data-[state=checked]:bg-[#b9472d] data-[state=checked]:text-white dark:border-[#68717A] dark:hover:border-[#FF6B3D] dark:focus-visible:ring-[#FF6B3D]/40 dark:data-[state=checked]:border-[#FF6B3D] dark:data-[state=checked]:bg-[#FF6B3D] dark:data-[state=checked]:text-[#101214]"
                                />
                                <Label
                                    htmlFor="remember"
                                    className="flex min-h-11 flex-1 cursor-pointer items-center"
                                >
                                    Ingat saya
                                </Label>
                            </div>

                            <Button
                                type="submit"
                                className="mt-1 min-h-12 w-full bg-[#b9472d] font-semibold text-white hover:bg-[#963820] focus-visible:border-[#123c30] focus-visible:ring-[#123c30] dark:bg-[#FF6B3D] dark:text-[#101214] dark:hover:bg-[#FF835F] dark:focus-visible:border-[#FF6B3D] dark:focus-visible:ring-[#FF6B3D]"
                                disabled={processing}
                                data-test="login-button"
                            >
                                {processing && <Spinner />}
                                {processing ? 'Sedang masuk...' : 'Masuk'}
                            </Button>
                        </div>

                        {canRegister && (
                            <p className="border-t border-[#aab3ae] pt-5 text-sm text-[#53635b] dark:border-[#40474E] dark:text-[#AEB4B9]">
                                Belum punya akun?{' '}
                                <TextLink
                                    href={register()}
                                    className="font-semibold text-[#123c30] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#123c30] dark:text-[#F4F1E8] dark:focus-visible:outline-[#FF6B3D]"
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
