<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LandedCost extends Model
{
    protected $fillable = ['team_id', 'purchase_invoice_id', 'created_by', 'allocation_number', 'description', 'amount', 'allocation_method'];

    protected $casts = ['amount' => 'decimal:2'];

    public function allocations(): HasMany
    {
        return $this->hasMany(LandedCostAllocation::class);
    }
}
