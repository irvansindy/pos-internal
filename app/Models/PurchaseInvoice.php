<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PurchaseInvoice extends Model
{
    public const STATUS_UNPAID = 'unpaid';

    public const STATUS_PARTIAL = 'partial';

    public const STATUS_PAID = 'paid';

    protected $fillable = ['team_id', 'supplier_id', 'purchase_order_id', 'created_by', 'document_number', 'supplier_invoice_number', 'invoice_date', 'due_date', 'status', 'subtotal', 'landed_cost_total', 'return_total', 'paid_total', 'balance_due', 'note'];

    protected $casts = ['invoice_date' => 'date', 'due_date' => 'date', 'subtotal' => 'decimal:2', 'landed_cost_total' => 'decimal:2', 'return_total' => 'decimal:2', 'paid_total' => 'decimal:2', 'balance_due' => 'decimal:2'];

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(PurchaseInvoiceItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(PurchaseInvoicePayment::class);
    }

    public function landedCosts(): HasMany
    {
        return $this->hasMany(LandedCost::class);
    }
}
