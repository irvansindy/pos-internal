<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransactionRefund extends Model
{
    public const STATUS_APPROVED = 'approved';
    public const STATUS_PENDING = 'pending';
    public const STATUS_REJECTED = 'rejected';

    protected $fillable = [
        'team_id',
        'transaction_id',
        'user_id',
        'refund_number',
        'amount',
        'method',
        'status',
        'reason',
        'refunded_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'refunded_at' => 'datetime',
    ];

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
