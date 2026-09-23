<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SupplierReturnItem extends Model
{
    protected $fillable = ['supplier_return_id', 'purchase_invoice_item_id', 'product_id', 'inventory_batch_id', 'warehouse_bin_id', 'quantity', 'unit_cost', 'subtotal'];

    protected $casts = ['quantity' => 'integer', 'unit_cost' => 'decimal:2', 'subtotal' => 'decimal:2'];
}
