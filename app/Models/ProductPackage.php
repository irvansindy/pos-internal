<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductPackage extends Model
{
    protected $fillable = [
        'team_id',
        'category_id',
        'sku',
        'name',
        'description',
        'base_price',
        'is_active',
    ];

    protected $casts = [
        'base_price' => 'decimal:2',
        'is_active'  => 'boolean',
    ];

    // ── Relationships ─────────────────────────────────────

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(ProductCategory::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(ProductPackageItem::class, 'package_id');
    }

    public function addonGroups(): HasMany
    {
        return $this->hasMany(ProductPackageAddonGroup::class, 'package_id')
            ->orderBy('sort_order');
    }

    public function activityLogs(): HasMany
    {
        return $this->hasMany(ProductActivityLog::class, 'subject_id')
            ->where('subject_type', self::class);
    }
}