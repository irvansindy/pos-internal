<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductPromotionReward extends Model
{
    protected $fillable = [
        'promotion_id',
        'product_id',
        'quantity',
        'extra_charge',
    ];

    protected $casts = [
        'quantity'     => 'integer',
        'extra_charge' => 'decimal:2',
    ];

    public function promotion(): BelongsTo
    {
        return $this->belongsTo(ProductPromotion::class, 'promotion_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}