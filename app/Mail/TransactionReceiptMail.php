<?php

namespace App\Mail;

use App\Models\Transaction;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class TransactionReceiptMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Transaction $transaction, private string $pdf) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: "Struk {$this->transaction->invoice_number}");
    }

    public function content(): Content
    {
        return new Content(view: 'emails.transaction-receipt');
    }

    public function attachments(): array
    {
        return [
            Attachment::fromData(fn () => $this->pdf, "{$this->transaction->invoice_number}.pdf")
                ->withMime('application/pdf'),
        ];
    }
}
