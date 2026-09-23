<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockTransferBatchAllocation extends Model
{
    protected $fillable = ['stock_transfer_item_id', 'from_inventory_batch_id', 'to_inventory_batch_id', 'from_warehouse_bin_id', 'to_warehouse_bin_id', 'quantity'];

    protected $casts = ['quantity' => 'integer'];

    public function sourceBatch(): BelongsTo
    {
        return $this->belongsTo(InventoryBatch::class, 'from_inventory_batch_id');
    }
}
