<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InventorySerial extends Model
{
    public const STATUS_IN_STOCK = 'in_stock';

    public const STATUS_IN_TRANSIT = 'in_transit';

    public const STATUS_SOLD = 'sold';

    public const STATUS_RETURNED = 'returned';

    protected $fillable = ['team_id', 'product_id', 'inventory_batch_id', 'warehouse_bin_id', 'purchase_order_item_id', 'serial_number', 'status'];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(InventoryBatch::class, 'inventory_batch_id');
    }

    public function bin(): BelongsTo
    {
        return $this->belongsTo(WarehouseBin::class, 'warehouse_bin_id');
    }

    public function transactionItemSerials(): HasMany
    {
        return $this->hasMany(TransactionItemSerial::class);
    }
}
