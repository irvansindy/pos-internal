<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TransactionItem extends Model
{
    public const ITEM_TYPE_PRODUCT = 'product';

    public const ITEM_TYPE_PACKAGE = 'package';

    public const ITEM_TYPE_PROMOTION = 'promotion';

    protected $fillable = [
        'transaction_id',
        'product_id',
        'product_unit_id',
        'item_type',
        'item_reference_id',
        'product_name',
        'product_sku',
        'unit_name',
        'unit_conversion',
        'unit_price',
        'quantity',
        'base_quantity',
        'discount_total',
        'line_total',
    ];

    protected $casts = [
        'unit_price' => 'decimal:2',
        'line_total' => 'decimal:2',
        'discount_total' => 'decimal:2',
        'quantity' => 'integer',
        'unit_conversion' => 'integer',
        'base_quantity' => 'integer',
    ];

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function serials(): HasMany
    {
        return $this->hasMany(TransactionItemSerial::class);
    }

    public function productUnit(): BelongsTo
    {
        return $this->belongsTo(ProductUnit::class);
    }

    public function returns(): HasMany
    {
        return $this->hasMany(TransactionReturn::class);
    }
}
