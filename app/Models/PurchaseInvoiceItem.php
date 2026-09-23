<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchaseInvoiceItem extends Model
{
    protected $fillable = ['purchase_invoice_id', 'purchase_order_item_id', 'product_id', 'quantity', 'unit_cost', 'subtotal', 'landed_cost_amount', 'returned_quantity'];

    protected $casts = ['quantity' => 'integer', 'returned_quantity' => 'integer', 'unit_cost' => 'decimal:2', 'subtotal' => 'decimal:2', 'landed_cost_amount' => 'decimal:2'];

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(PurchaseInvoice::class, 'purchase_invoice_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
