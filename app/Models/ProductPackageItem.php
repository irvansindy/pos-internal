<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductPackageItem extends Model
{
    protected $fillable = [
        'package_id',
        'product_id',
        'quantity',
        'note',
    ];

    protected $casts = [
        'quantity' => 'integer',
    ];

    public function package(): BelongsTo
    {
        return $this->belongsTo(ProductPackage::class, 'package_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}