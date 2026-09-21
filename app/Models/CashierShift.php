<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CashierShift extends Model
{
    public const STATUS_OPEN = 'open';

    public const STATUS_CLOSED = 'closed';

    protected $fillable = [
        'team_id',
        'user_id',
        'status',
        'open_guard',
        'opening_amount',
        'sales_cash_amount',
        'refunds_cash_amount',
        'cash_in_amount',
        'cash_out_amount',
        'expected_amount',
        'counted_amount',
        'difference_amount',
        'opening_note',
        'closing_note',
        'opened_at',
        'closed_at',
    ];

    protected function casts(): array
    {
        return [
            'opening_amount' => 'decimal:2',
            'sales_cash_amount' => 'decimal:2',
            'refunds_cash_amount' => 'decimal:2',
            'cash_in_amount' => 'decimal:2',
            'cash_out_amount' => 'decimal:2',
            'expected_amount' => 'decimal:2',
            'counted_amount' => 'decimal:2',
            'difference_amount' => 'decimal:2',
            'opened_at' => 'datetime',
            'closed_at' => 'datetime',
        ];
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function movements(): HasMany
    {
        return $this->hasMany(CashierCashMovement::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(TransactionPayment::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }

    public static function guardFor(int $teamId, int $userId): string
    {
        return "{$teamId}:{$userId}";
    }
}
