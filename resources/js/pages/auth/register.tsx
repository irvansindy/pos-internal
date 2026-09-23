import { Form, Head } from '@inertiajs/react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { login } from '@/routes';
import { store } from '@/routes/register';

const fieldClass =
    'border-[#65756d] bg-white focus-visible:border-[#123c30] focus-visible:ring-[#123c30] dark:border-[#68717A] dark:bg-[#15181B] dark:focus-visible:border-[#FF6B3D] dark:focus-visible:ring-[#FF6B3D]';

export default function Register() {
    return (
        <>
            <Head title="Daftar" />
            <Form
                {...store.form()}
                resetOnSuccess={['password', 'password_confirmation']}
                disableWhileProcessing
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-5">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Nama lengkap</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    required
                                    autoFocus
                                    autoComplete="name"
                                    name="name"
                                    placeholder="Nama pemilik atau pengelola"
                                    aria-invalid={Boolean(errors.name)}
                                    aria-describedby={
                                        errors.name ? 'name-error' : undefined
                                    }
                                    className={fieldClass}
                                />
                                <InputError
                                    id="name-error"
                                    message={errors.name}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    required
                                    autoComplete="email"
                                    name="email"
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
                                <Label htmlFor="password">Kata sandi</Label>
                                <PasswordInput
                                    id="password"
                                    required
                                    autoComplete="new-password"
                                    name="password"
                                    placeholder="Minimal 8 karakter"
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

                            <div className="grid gap-2">
                                <Label htmlFor="password_confirmation">
                                    Ulangi kata sandi
                                </Label>
                                <PasswordInput
                                    id="password_confirmation"
                                    required
                                    autoComplete="new-password"
                                    name="password_confirmation"
                                    placeholder="Ketik ulang kata sandi"
                                    aria-invalid={Boolean(
                                        errors.password_confirmation,
                                    )}
                                    aria-describedby={
                                        errors.password_confirmation
                                            ? 'password-confirmation-error'
                                            : undefined
                                    }
                                    className={fieldClass}
                                />
                                <InputError
                                    id="password-confirmation-error"
                                    message={errors.password_confirmation}
                                />
                            </div>

                            <Button
                                type="submit"
                                className="mt-1 min-h-12 w-full bg-[#b9472d] font-semibold text-white hover:bg-[#963820] focus-visible:border-[#123c30] focus-visible:ring-[#123c30] dark:bg-[#FF6B3D] dark:text-[#101214] dark:hover:bg-[#FF835F] dark:focus-visible:border-[#FF6B3D] dark:focus-visible:ring-[#FF6B3D]"
                                disabled={processing}
                                data-test="register-user-button"
                            >
                                {processing && <Spinner />}
                                {processing
                                    ? 'Sedang membuat akun...'
                                    : 'Buat akun toko'}
                            </Button>
                        </div>

                        <p className="border-t border-[#aab3ae] pt-5 text-sm text-[#53635b] dark:border-[#40474E] dark:text-[#AEB4B9]">
                            Sudah punya akun?{' '}
                            <TextLink
                                href={login()}
                                className="font-semibold text-[#123c30] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#123c30] dark:text-[#F4F1E8] dark:focus-visible:outline-[#FF6B3D]"
                            >
                                Masuk
                            </TextLink>
                        </p>
                    </>
                )}
            </Form>
        </>
    );
}

Register.layout = {
    title: 'Siapkan akun toko.',
    description:
        'Akun pertama menjadi pemilik organisasi dan dapat menambahkan toko serta anggota tim.',
};
