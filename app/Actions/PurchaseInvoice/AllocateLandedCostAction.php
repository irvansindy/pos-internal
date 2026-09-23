<?php

namespace App\Actions\PurchaseInvoice;

use App\Models\LandedCost;
use App\Models\PurchaseInvoice;
use App\Models\User;
use App\Support\DocumentNumberGenerator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AllocateLandedCostAction
{
    public function execute(PurchaseInvoice $invoice, User $user, array $data): PurchaseInvoice
    {
        return DB::transaction(function () use ($invoice, $user, $data) {
            $locked = PurchaseInvoice::query()->with('items.product')->lockForUpdate()->findOrFail($invoice->id);
            $amount = round((float) $data['amount'], 2);

            if ($amount <= 0 || $locked->items->isEmpty()) {
                throw ValidationException::withMessages(['amount' => 'Landed cost harus lebih dari nol dan invoice harus memiliki item.']);
            }

            $cost = LandedCost::create([
                'team_id' => $locked->team_id,
                'purchase_invoice_id' => $locked->id,
                'created_by' => $user->id,
                'allocation_number' => DocumentNumberGenerator::generate('LC', 'landed_costs', 'allocation_number', $locked->team_id),
                'description' => $data['description'],
                'amount' => $amount,
                'allocation_method' => $data['allocation_method'],
            ]);

            $weights = $locked->items->mapWithKeys(fn ($item) => [
                $item->id => $data['allocation_method'] === 'quantity'
                    ? $item->quantity
                    : (float) $item->subtotal,
            ]);
            $weightTotal = (float) $weights->sum();
            if ($weightTotal <= 0) {
                $weights = $locked->items->mapWithKeys(fn ($item) => [$item->id => $item->quantity]);
                $weightTotal = (float) $weights->sum();
            }
            $allocated = 0.0;

            foreach ($locked->items->values() as $index => $item) {
                $share = $index === $locked->items->count() - 1
                    ? round($amount - $allocated, 2)
                    : round($amount * ((float) $weights[$item->id] / $weightTotal), 2);
                $allocated += $share;
                $cost->allocations()->create(['purchase_invoice_item_id' => $item->id, 'amount' => $share]);
                $previousLandedCost = (float) $item->landed_cost_amount;
                $item->increment('landed_cost_amount', $share);
                $item->product->update(['cost' => round(((float) $item->subtotal + $previousLandedCost + $share) / $item->quantity, 2)]);
            }

            $landedTotal = (float) $locked->landed_cost_total + $amount;
            $balance = max(0, (float) $locked->subtotal + $landedTotal - (float) $locked->return_total - (float) $locked->paid_total);
            $locked->update([
                'landed_cost_total' => $landedTotal,
                'balance_due' => $balance,
                'status' => (float) $locked->paid_total > 0 ? PurchaseInvoice::STATUS_PARTIAL : PurchaseInvoice::STATUS_UNPAID,
            ]);

            return $locked->refresh()->load(['items.product', 'landedCosts.allocations']);
        });
    }
}
