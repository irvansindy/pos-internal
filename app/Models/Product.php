<?php

namespace App\Models;

use App\Support\CatalogImageStorage;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    protected $fillable = [
        'team_id',
        'category_id',
        'parent_product_id',
        'sku',
        'barcode',
        'base_unit',
        'name',
        'variant_name',
        'description',
        'image_path',
        'price',
        'cost',
        'stock',
        'min_stock',
        'tracks_batches',
        'tracks_serials',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'tracks_batches' => 'boolean',
        'tracks_serials' => 'boolean',
        'price' => 'decimal:2',
        'cost' => 'decimal:2',
    ];

    protected $appends = ['image_url'];

    public function getImageUrlAttribute(): ?string
    {
        return CatalogImageStorage::url($this->image_path);
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(ProductCategory::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_product_id');
    }

    public function variants(): HasMany
    {
        return $this->hasMany(self::class, 'parent_product_id');
    }

    public function units(): HasMany
    {
        return $this->hasMany(ProductUnit::class);
    }

    public function inventoryBatches(): HasMany
    {
        return $this->hasMany(InventoryBatch::class);
    }

    public function inventorySerials(): HasMany
    {
        return $this->hasMany(InventorySerial::class);
    }

    public function locationBalances(): HasMany
    {
        return $this->hasMany(InventoryLocationBalance::class);
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(ProductStockMovement::class);
    }

    public function activityLogs(): HasMany
    {
        return $this->hasMany(ProductActivityLog::class, 'subject_id')
            ->where('subject_type', self::class);
    }

    public function transactionItems(): HasMany
    {
        return $this->hasMany(TransactionItem::class);
    }

    public function purchaseOrderItems(): HasMany
    {
        return $this->hasMany(PurchaseOrderItem::class);
    }

    public function stockOpnameItems(): HasMany
    {
        return $this->hasMany(StockOpnameItem::class);
    }
}
