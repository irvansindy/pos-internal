<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransactionItem extends Model
{
    public const ITEM_TYPE_PRODUCT = 'product';
    public const ITEM_TYPE_PACKAGE = 'package';
    public const ITEM_TYPE_PROMOTION = 'promotion';

    protected $fillable = [
        'transaction_id',
        'product_id',
        'item_type',
        'item_reference_id',
        'product_name',
        'product_sku',
        'unit_price',
        'quantity',
        'discount_total',
        'line_total',
    ];

    protected $casts = [
        'unit_price' => 'decimal:2',
        'line_total' => 'decimal:2',
        'discount_total' => 'decimal:2',
        'quantity' => 'integer',
    ];

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
