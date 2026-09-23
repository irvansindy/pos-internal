<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchaseInvoicePayment extends Model
{
    protected $fillable = ['team_id', 'purchase_invoice_id', 'created_by', 'payment_number', 'paid_at', 'amount', 'method', 'reference', 'note'];

    protected $casts = ['paid_at' => 'date', 'amount' => 'decimal:2'];

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(PurchaseInvoice::class, 'purchase_invoice_id');
    }
}
