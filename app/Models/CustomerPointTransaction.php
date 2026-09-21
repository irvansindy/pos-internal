<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerPointTransaction extends Model
{
    public const TYPE_EARN = 'earn';

    public const TYPE_REDEEM = 'redeem';

    public const TYPE_ADJUSTMENT = 'adjustment';

    public const TYPE_VOID = 'void';

    protected $fillable = ['customer_id', 'transaction_id', 'type', 'points', 'balance_after', 'note'];

    protected $casts = ['points' => 'integer', 'balance_after' => 'integer'];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }
}
