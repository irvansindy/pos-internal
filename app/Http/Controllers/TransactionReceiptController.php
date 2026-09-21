<?php

namespace App\Http\Controllers;

use App\Mail\TransactionReceiptMail;
use App\Models\Transaction;
use App\Services\Pdf\TransactionReceiptPdfGenerator;
use App\Services\WhatsApp\FonnteReceiptSender;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;

class TransactionReceiptController extends Controller
{
    public function pdf(Request $request, string $current_team, Transaction $transaction, TransactionReceiptPdfGenerator $generator)
    {
        $transaction = $this->scopedTransaction($request, $transaction);
        $pdf = $generator->generate($transaction);

        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "attachment; filename=\"{$transaction->invoice_number}.pdf\"",
        ]);
    }

    public function email(Request $request, string $current_team, Transaction $transaction, TransactionReceiptPdfGenerator $generator)
    {
        $transaction = $this->scopedTransaction($request, $transaction);
        $validated = $request->validate(['email' => ['required', 'email', 'max:255']]);
        $transaction->update(['customer_email' => $validated['email']]);

        Mail::to($validated['email'])->send(new TransactionReceiptMail($transaction, $generator->generate($transaction)));
        Inertia::flash('success', "Struk {$transaction->invoice_number} terkirim ke email.");

        return back();
    }

    public function whatsapp(Request $request, string $current_team, Transaction $transaction, TransactionReceiptPdfGenerator $generator, FonnteReceiptSender $sender)
    {
        $transaction = $this->scopedTransaction($request, $transaction);
        $validated = $request->validate(['phone' => ['required', 'string', 'max:32', 'regex:/^[0-9+() -]+$/']]);
        $transaction->update(['customer_phone' => $validated['phone']]);

        $sender->send($transaction, $validated['phone'], $generator->generate($transaction));
        Inertia::flash('success', "Struk {$transaction->invoice_number} terkirim ke WhatsApp.");

        return back();
    }

    private function scopedTransaction(Request $request, Transaction $transaction): Transaction
    {
        abort_unless($request->user()->currentTeam?->id === $transaction->team_id, 404);

        return $transaction->load(['team', 'items', 'cashier:id,name', 'customer', 'diningTable']);
    }
}
