<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductPackageAddonGroup extends Model
{
    protected $fillable = [
        'package_id',
        'name',
        'default_product_id',
        'is_required',
        'sort_order',
    ];

    protected $casts = [
        'is_required' => 'boolean',
        'sort_order'  => 'integer',
    ];

    public function package(): BelongsTo
    {
        return $this->belongsTo(ProductPackage::class, 'package_id');
    }

    public function defaultProduct(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'default_product_id');
    }

    public function options(): HasMany
    {
        return $this->hasMany(ProductPackageAddonOption::class, 'addon_group_id')
            ->orderBy('sort_order');
    }
}