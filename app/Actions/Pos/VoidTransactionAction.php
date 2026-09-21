<?php

namespace App\Actions\Pos;

use App\Actions\ProductStock\AdjustProductStockAction;
use App\Models\CustomerPointTransaction;
use App\Models\DiningTable;
use App\Models\Product;
use App\Models\ProductStockMovement;
use App\Models\Team;
use App\Models\Transaction;
use App\Models\TransactionRefund;
use App\Models\TransactionReturn;
use App\Models\User;
use App\Models\Voucher;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class VoidTransactionAction
{
    public function __construct(private AdjustProductStockAction $adjustProductStockAction) {}

    /**
     * Void a transaction and return every product it deducted stock for
     * back to inventory.
     *
     * Stock is reversed by replaying the EXACT `ProductStockMovement`
     * rows this transaction created at checkout time (matched via
     * reference_type/reference_id), rather than recomputing quantities
     * from `transaction_items` — line items for packages/promotions
     * don't carry a single product_id (one line can touch several
     * products), so the stock movement log is the only place that has
     * the precise per-product breakdown.
     */
    public function execute(Team $team, Transaction $transaction, User $user, ?string $reason = null): Transaction
    {
        if ($transaction->team_id !== $team->id) {
            abort(404);
        }

        return DB::transaction(function () use ($team, $transaction, $user, $reason) {
            $lockedTransaction = Transaction::query()
                ->where('team_id', $team->id)
                ->whereKey($transaction->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedTransaction->status === Transaction::STATUS_VOID) {
                throw ValidationException::withMessages([
                    'transaction' => 'Transaksi ini sudah dibatalkan sebelumnya.',
                ]);
            }

            if ($lockedTransaction->refunds()->where('status', TransactionRefund::STATUS_APPROVED)->exists()
                || $lockedTransaction->returns()->where('status', TransactionReturn::STATUS_APPROVED)->exists()) {
                throw ValidationException::withMessages([
                    'transaction' => 'Transaksi dengan refund atau return yang sudah disetujui tidak dapat dibatalkan.',
                ]);
            }

            $outboundMovements = ProductStockMovement::where('reference_type', Transaction::class)
                ->where('reference_id', $lockedTransaction->id)
                ->where('team_id', $team->id)
                ->where('type', ProductStockMovement::TYPE_OUT)
                ->get();

            foreach ($outboundMovements as $movement) {
                $product = Product::where('team_id', $team->id)->find($movement->product_id);

                // Produk mungkin sudah dihapus sejak transaksi dibuat —
                // lewati saja, tidak ada stok untuk dikembalikan.
                if (! $product) {
                    continue;
                }

                $this->adjustProductStockAction->execute($product, $user, [
                    'type' => ProductStockMovement::TYPE_IN,
                    'quantity' => $movement->quantity,
                    'note' => "Pembatalan transaksi {$lockedTransaction->invoice_number}",
                    'reference_type' => Transaction::class,
                    'reference_id' => $lockedTransaction->id,
                ]);
            }

            $lockedTransaction->update([
                'status' => Transaction::STATUS_VOID,
                'void_reason' => $reason,
                'voided_at' => now(),
                'voided_by' => $user->id,
            ]);

            if ($lockedTransaction->voucher_id) {
                $voucher = Voucher::query()
                    ->where('team_id', $team->id)
                    ->whereKey($lockedTransaction->voucher_id)
                    ->lockForUpdate()
                    ->first();

                if ($voucher && $voucher->used_count > 0) {
                    $voucher->decrement('used_count');
                }
            }

            if ($lockedTransaction->customer_id) {
                $customer = $lockedTransaction->customer()->lockForUpdate()->first();
                $pointsNet = (int) $lockedTransaction->pointTransactions()
                    ->whereIn('type', [CustomerPointTransaction::TYPE_EARN, CustomerPointTransaction::TYPE_REDEEM])
                    ->sum('points');

                if ($customer && $pointsNet !== 0 && ! $lockedTransaction->pointTransactions()->where('type', CustomerPointTransaction::TYPE_VOID)->exists()) {
                    $newBalance = (int) $customer->points_balance - $pointsNet;
                    if ($newBalance < 0) {
                        throw ValidationException::withMessages(['transaction' => 'Transaksi tidak dapat dibatalkan karena poin yang diperoleh sudah digunakan pelanggan.']);
                    }
                    $customer->update(['points_balance' => $newBalance]);
                    $customer->pointTransactions()->create([
                        'transaction_id' => $lockedTransaction->id,
                        'type' => CustomerPointTransaction::TYPE_VOID,
                        'points' => -$pointsNet,
                        'balance_after' => $newBalance,
                        'note' => "Pembalikan poin {$lockedTransaction->invoice_number}",
                    ]);
                }
            }

            if ($lockedTransaction->diningTable) {
                $hasAnotherOpenOrder = $lockedTransaction->diningTable->transactions()
                    ->whereKeyNot($lockedTransaction->id)
                    ->where('status', '!=', Transaction::STATUS_VOID)
                    ->where('payment_status', '!=', Transaction::PAYMENT_STATUS_PAID)
                    ->exists();

                if (! $hasAnotherOpenOrder) {
                    $lockedTransaction->diningTable->update(['status' => DiningTable::STATUS_AVAILABLE]);
                }
            }

            return $lockedTransaction->fresh();
        });
    }
}
