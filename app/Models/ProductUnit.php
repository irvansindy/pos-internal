<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductUnit extends Model
{
    protected $fillable = ['team_id', 'product_id', 'name', 'abbreviation', 'conversion_quantity', 'barcode', 'selling_price', 'is_active'];

    protected $casts = ['conversion_quantity' => 'integer', 'selling_price' => 'decimal:2', 'is_active' => 'boolean'];

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
