<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryBatchMovement extends Model
{
    protected $fillable = ['team_id', 'product_id', 'inventory_batch_id', 'product_stock_movement_id', 'type', 'quantity', 'quantity_before', 'quantity_after'];

    public function batch(): BelongsTo
    {
        return $this->belongsTo(InventoryBatch::class, 'inventory_batch_id');
    }
}
