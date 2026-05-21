<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

class ProductPromotion extends Model
{
    public const TYPE_BXGY = 'bxgy';

    protected $fillable = [
        'team_id',
        'name',
        'description',
        'type',
        'is_active',
        'starts_at',
        'ends_at',
    ];

    protected $casts = [
        'is_active'  => 'boolean',
        'starts_at'  => 'date',
        'ends_at'    => 'date',
    ];

    // ── Relationships ─────────────────────────────────────

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function triggers(): HasMany
    {
        return $this->hasMany(ProductPromotionTrigger::class, 'promotion_id');
    }

    public function rewards(): HasMany
    {
        return $this->hasMany(ProductPromotionReward::class, 'promotion_id');
    }

    public function activityLogs(): HasMany
    {
        return $this->hasMany(ProductActivityLog::class, 'subject_id')
            ->where('subject_type', self::class);
    }

    // ── Scopes ────────────────────────────────────────────

    public function scopeActive(Builder $query): Builder
    {
        $today = Carbon::today();

        return $query
            ->where('is_active', true)
            ->where(fn (Builder $q) => $q
                ->whereNull('starts_at')
                ->orWhere('starts_at', '<=', $today)
            )
            ->where(fn (Builder $q) => $q
                ->whereNull('ends_at')
                ->orWhere('ends_at', '>=', $today)
            );
    }

    // ── Helpers ───────────────────────────────────────────

    public function isCurrentlyActive(): bool
    {
        if (! $this->is_active) {
            return false;
        }

        $today = Carbon::today();

        if ($this->starts_at && $this->starts_at->gt($today)) {
            return false;
        }

        if ($this->ends_at && $this->ends_at->lt($today)) {
            return false;
        }

        return true;
    }
}