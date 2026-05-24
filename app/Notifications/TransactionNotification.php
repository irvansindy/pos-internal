<?php

namespace App\Notifications;

use App\Models\Transaction;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class TransactionNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Transaction $transaction, public string $action)
    {
        //
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'transaction_id' => $this->transaction->id,
            'invoice_number' => $this->transaction->invoice_number,
            'customer_name' => $this->transaction->customer_name,
            'team_id' => $this->transaction->team_id,
            'action' => $this->action,
            'payment_status' => $this->transaction->payment_status,
            'grand_total' => (string) $this->transaction->grand_total,
        ];
    }
}
