<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LandedCostAllocation extends Model
{
    protected $fillable = ['landed_cost_id', 'purchase_invoice_item_id', 'amount'];

    protected $casts = ['amount' => 'decimal:2'];
}
