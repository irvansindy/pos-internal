<?php

namespace App\Actions\Transaction;

use App\Actions\ProductStock\AdjustProductStockAction;
use App\Models\CashierShift;
use App\Models\ProductStockMovement;
use App\Models\Team;
use App\Models\Transaction;
use App\Models\TransactionItem;
use App\Models\TransactionRefund;
use App\Models\TransactionReturn;
use App\Models\User;
use App\Support\DocumentNumberGenerator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CreateTransactionReturnAction
{
    public function __construct(
        private AdjustProductStockAction $adjustProductStockAction,
    ) {}

    public function execute(Team $team, User $user, array $data): TransactionReturn
    {
        return DB::transaction(function () use ($team, $user, $data) {
            $item = TransactionItem::query()
                ->whereKey($data['transaction_item_id'])
                ->whereHas('transaction', fn ($query) => $query->where('team_id', $team->id))
                ->with('product')
                ->lockForUpdate()
                ->firstOrFail();

            $transaction = Transaction::query()
                ->where('team_id', $team->id)
                ->whereKey($item->transaction_id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($transaction->status !== Transaction::STATUS_COMPLETED) {
                throw ValidationException::withMessages([
                    'transaction_item_id' => 'Return hanya dapat dibuat untuk transaksi selesai.',
                ]);
            }

            if (! in_array($transaction->payment_status, [Transaction::PAYMENT_STATUS_PAID, Transaction::PAYMENT_STATUS_PARTIAL], true)) {
                throw ValidationException::withMessages([
                    'transaction_item_id' => 'Return hanya dapat dibuat untuk transaksi yang sudah menerima pembayaran.',
                ]);
            }

            if (! $item->product_id) {
                throw ValidationException::withMessages([
                    'transaction_item_id' => 'Return stok hanya tersedia untuk item produk.',
                ]);
            }

            $returnedQuantity = (int) $item->returns()
                ->where('status', '!=', TransactionReturn::STATUS_REJECTED)
                ->sum('quantity');
            $remainingQuantity = max($item->quantity - $returnedQuantity, 0);
            $quantity = (int) $data['quantity'];

            if ($quantity > $remainingQuantity) {
                throw ValidationException::withMessages([
                    'quantity' => 'Jumlah return melebihi sisa item yang dapat direturn.',
                ]);
            }

            $status = $data['status'] ?? TransactionReturn::STATUS_APPROVED;
            $maximumItemRefund = $this->defaultRefundAmount($item, $quantity);
            $refundAmount = isset($data['refund_amount'])
                ? (float) $data['refund_amount']
                : $maximumItemRefund;

            if ($refundAmount > $maximumItemRefund) {
                throw ValidationException::withMessages([
                    'refund_amount' => 'Nominal refund melebihi nilai item yang direturn.',
                ]);
            }

            if ($status === TransactionReturn::STATUS_APPROVED) {
                $refunded = (float) $transaction->refunds()
                    ->where('status', TransactionRefund::STATUS_APPROVED)
                    ->sum('amount');
                $returned = (float) $transaction->returns()
                    ->where('status', TransactionReturn::STATUS_APPROVED)
                    ->sum('refund_amount');
                $collected = min((float) $transaction->paid_amount, (float) $transaction->grand_total);
                $remainingRefund = max($collected - $refunded - $returned, 0);

                if ($refundAmount > $remainingRefund) {
                    throw ValidationException::withMessages([
                        'refund_amount' => 'Nominal refund melebihi sisa pembayaran yang dapat dikembalikan.',
                    ]);
                }
            }

            $return = TransactionReturn::create([
                'team_id' => $team->id,
                'transaction_id' => $item->transaction_id,
                'transaction_item_id' => $item->id,
                'product_id' => $item->product_id,
                'user_id' => $user->id,
                'cashier_shift_id' => CashierShift::query()
                    ->where('team_id', $team->id)
                    ->where('user_id', $user->id)
                    ->where('status', CashierShift::STATUS_OPEN)
                    ->value('id'),
                'return_number' => DocumentNumberGenerator::generate('RTN', 'transaction_returns', 'return_number', $team->id),
                'quantity' => $quantity,
                'refund_amount' => $refundAmount,
                'refund_method' => $data['refund_method'] ?? $transaction->payment_method ?? 'cash',
                'restock' => (bool) ($data['restock'] ?? true),
                'status' => $status,
                'reason' => $data['reason'] ?? null,
                'returned_at' => $status === TransactionReturn::STATUS_APPROVED ? now() : null,
            ]);

            if ($return->restock && $return->status === TransactionReturn::STATUS_APPROVED && $item->product) {
                $this->adjustProductStockAction->execute($item->product, $user, [
                    'type' => ProductStockMovement::TYPE_IN,
                    'quantity' => $return->quantity,
                    'note' => "Return barang {$return->return_number}",
                    'reference_type' => TransactionReturn::class,
                    'reference_id' => $return->id,
                ]);
            }

            return $return->load([
                'transaction:id,invoice_number,customer_name',
                'transactionItem:id,product_name,product_sku,unit_price,quantity',
                'product:id,name,sku,stock',
                'user:id,name',
            ]);
        });
    }

    private function defaultRefundAmount(TransactionItem $item, int $quantity): float
    {
        $lineTotal = (float) $item->line_total;
        $unitNet = $item->quantity > 0 ? $lineTotal / $item->quantity : 0;

        return $unitNet * $quantity;
    }
}
