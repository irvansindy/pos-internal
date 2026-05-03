import { useFlashToast } from '@/hooks/use-flash-toast';
import { useAppearance } from '@/hooks/use-appearance';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

function Toaster({ ...props }: ToasterProps) {
    const { appearance } = useAppearance();

    useFlashToast();

    return (
        <Sonner
            theme={appearance}
            className="toaster group"
            position="bottom-right"
            toastOptions={{
                style: {
                    background: '#ffffff',
                    color: '#000000',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                },
            }}
            style={
                {
                    '--normal-bg': '#ffffff',
                    '--normal-text': '#000000',
                    '--normal-border': '#e5e7eb',
                    bottom: '20px',
                    right: '20px',
                    top: 'auto',
                    left: 'auto',
                } as React.CSSProperties
            }
            {...props}
        />
    );
}

export { Toaster };
