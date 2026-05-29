<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransactionReturn extends Model
{
    public const STATUS_APPROVED = 'approved';
    public const STATUS_PENDING = 'pending';
    public const STATUS_REJECTED = 'rejected';

    protected $fillable = [
        'team_id',
        'transaction_id',
        'transaction_item_id',
        'product_id',
        'user_id',
        'return_number',
        'quantity',
        'refund_amount',
        'restock',
        'status',
        'reason',
        'returned_at',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'refund_amount' => 'decimal:2',
        'restock' => 'boolean',
        'returned_at' => 'datetime',
    ];

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }

    public function transactionItem(): BelongsTo
    {
        return $this->belongsTo(TransactionItem::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
