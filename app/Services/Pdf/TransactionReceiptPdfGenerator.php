<?php

namespace App\Services\Pdf;

use App\Models\Transaction;
use Dompdf\Dompdf;
use Dompdf\Options;

class TransactionReceiptPdfGenerator
{
    public function generate(Transaction $transaction): string
    {
        $transaction->loadMissing(['team', 'cashier:id,name', 'items', 'customer', 'diningTable']);

        $html = view('pdf.transaction-receipt', ['transaction' => $transaction])->render();
        $options = new Options;
        $options->set('isRemoteEnabled', false);
        $options->set('defaultFont', 'Helvetica');

        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($html);
        $dompdf->setPaper([0, 0, 226.77, 600], 'portrait');
        $dompdf->render();

        return $dompdf->output();
    }
}
