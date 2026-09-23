<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InventoryBatch extends Model
{
    protected $fillable = ['team_id', 'product_id', 'purchase_order_item_id', 'batch_number', 'expires_at', 'quantity'];

    protected $casts = ['expires_at' => 'date', 'quantity' => 'integer'];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function movements(): HasMany
    {
        return $this->hasMany(InventoryBatchMovement::class);
    }

    public function locationBalances(): HasMany
    {
        return $this->hasMany(InventoryLocationBalance::class);
    }
}
