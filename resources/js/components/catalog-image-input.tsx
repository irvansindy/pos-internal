import { ImageIcon, Trash2, Upload } from 'lucide-react';
import type { ChangeEvent } from 'react';
import { useEffect, useRef, useState } from 'react';

type Props = {
    id: string;
    label: string;
    currentImageUrl?: string | null;
    removeImage?: boolean;
    error?: string;
    disabled?: boolean;
    onFileChange: (file: File | null) => void;
    onRemoveImageChange: (remove: boolean) => void;
};

export default function CatalogImageInput({
    id,
    label,
    currentImageUrl,
    removeImage = false,
    error,
    disabled = false,
    onFileChange,
    onRemoveImageChange,
}: Props) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const previewUrlRef = useRef<string | null>(null);

    useEffect(() => {
        return () => {
            if (previewUrlRef.current) {
                URL.revokeObjectURL(previewUrlRef.current);
            }
        };
    }, []);

    const visibleImageUrl =
        previewUrl ?? (!removeImage ? currentImageUrl : null);

    function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
        const selectedFile = event.target.files?.[0] ?? null;

        if (previewUrlRef.current) {
            URL.revokeObjectURL(previewUrlRef.current);
        }

        const objectUrl = selectedFile
            ? URL.createObjectURL(selectedFile)
            : null;
        previewUrlRef.current = objectUrl;
        setPreviewUrl(objectUrl);

        onFileChange(selectedFile);
        onRemoveImageChange(false);
        event.target.value = '';
    }

    function handleRemoveImage() {
        if (previewUrlRef.current) {
            URL.revokeObjectURL(previewUrlRef.current);
            previewUrlRef.current = null;
        }

        setPreviewUrl(null);
        onFileChange(null);
        onRemoveImageChange(Boolean(currentImageUrl));
    }

    return (
        <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <label
                    htmlFor={id}
                    className="text-xs font-semibold tracking-[0.04em] text-card-foreground uppercase"
                >
                    {label}
                    <span className="ml-1 font-normal tracking-normal text-muted-foreground normal-case">
                        (opsional)
                    </span>
                </label>
                <span className="text-[11px] text-muted-foreground">
                    JPG, PNG, WebP · maks. 2 MB
                </span>
            </div>

            <div
                className={`flex min-h-24 items-center gap-3 rounded-lg border p-3 ${
                    error ? 'border-destructive' : 'border-border'
                } bg-background`}
            >
                <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground">
                    {visibleImageUrl ? (
                        <img
                            src={visibleImageUrl}
                            alt={`Preview ${label.toLowerCase()}`}
                            className="size-full object-cover"
                        />
                    ) : (
                        <ImageIcon className="size-6" aria-hidden="true" />
                    )}
                </div>

                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    <label
                        htmlFor={id}
                        className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 text-xs font-semibold text-card-foreground focus-within:ring-2 focus-within:ring-ring hover:bg-muted ${
                            disabled ? 'pointer-events-none opacity-50' : ''
                        }`}
                    >
                        <Upload className="size-4" aria-hidden="true" />
                        {visibleImageUrl ? 'Ganti foto' : 'Pilih foto'}
                        <input
                            id={id}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="sr-only"
                            onChange={handleFileChange}
                            disabled={disabled}
                        />
                    </label>

                    {visibleImageUrl && (
                        <button
                            type="button"
                            onClick={handleRemoveImage}
                            disabled={disabled}
                            className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-xs font-semibold text-destructive hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
                        >
                            <Trash2 className="size-4" aria-hidden="true" />
                            Hapus foto
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <p className="mt-1 text-xs text-destructive" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}
