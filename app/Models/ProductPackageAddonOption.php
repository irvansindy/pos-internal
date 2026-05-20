<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductPackageAddonOption extends Model
{
    protected $fillable = [
        'addon_group_id',
        'product_id',
        'extra_charge',
        'sort_order',
    ];

    protected $casts = [
        'extra_charge' => 'decimal:2',
        'sort_order'   => 'integer',
    ];

    public function addonGroup(): BelongsTo
    {
        return $this->belongsTo(ProductPackageAddonGroup::class, 'addon_group_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}