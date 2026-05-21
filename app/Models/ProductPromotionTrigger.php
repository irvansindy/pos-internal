<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductPromotionTrigger extends Model
{
    protected $fillable = [
        'promotion_id',
        'product_id',
        'min_quantity',
    ];

    protected $casts = [
        'min_quantity' => 'integer',
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