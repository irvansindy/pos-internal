<?php

namespace App\Services\WhatsApp;

use App\Models\Transaction;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

class FonnteReceiptSender
{
    public function send(Transaction $transaction, string $phone, string $pdf): void
    {
        $token = (string) config('fonnte.token');

        if ($token === '') {
            throw ValidationException::withMessages(['phone' => 'FONNTE_TOKEN belum dikonfigurasi.']);
        }

        $response = Http::withHeaders(['Authorization' => $token])
            ->timeout(30)
            ->attach('file', $pdf, "{$transaction->invoice_number}.pdf")
            ->post((string) config('fonnte.endpoint'), [
                'target' => $phone,
                'countryCode' => '62',
                'message' => "Terima kasih. Berikut struk digital {$transaction->invoice_number} dari {$transaction->team->name}.",
                'filename' => "{$transaction->invoice_number}.pdf",
            ]);

        if ($response->failed() || $response->json('status') === false) {
            throw ValidationException::withMessages(['phone' => 'Struk WhatsApp gagal dikirim. Periksa token dan status perangkat Fonnte.']);
        }
    }
}
