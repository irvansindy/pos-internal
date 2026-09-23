<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InventoryLocationMovement extends Model
{
    protected $fillable = ['team_id', 'product_id', 'warehouse_bin_id', 'inventory_batch_id', 'product_stock_movement_id', 'type', 'quantity', 'quantity_before', 'quantity_after'];

    protected $casts = ['quantity' => 'integer', 'quantity_before' => 'integer', 'quantity_after' => 'integer'];
}
