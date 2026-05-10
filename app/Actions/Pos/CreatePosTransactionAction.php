<?php

namespace App\Actions\Pos;

use App\Actions\ProductStock\AdjustProductStockAction;
use App\Models\Product;
use App\Models\ProductStockMovement;
use App\Models\Team;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Voucher;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CreatePosTransactionAction
{
    public function __construct(
        private AdjustProductStockAction $adjustProductStockAction,
    ) {}

    public function execute(Team $team, User $cashier, array $data): Transaction
    {
        return DB::transaction(function () use ($team, $cashier, $data) {
            $cartItems = collect($data['items'])
                ->keyBy('product_id')
                ->map(fn (array $item) => [
                    'product_id' => (int) $item['product_id'],
                    'quantity' => (int) $item['quantity'],
                ]);

            $products = Product::where('team_id', $team->id)
                ->whereIn('id', $cartItems->keys())
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            if ($products->count() !== $cartItems->count()) {
                throw ValidationException::withMessages([
                    'items' => 'Sebagian produk tidak ditemukan pada tim ini.',
                ]);
            }

            $subtotal = 0.0;
            $items = [];

            foreach ($cartItems as $item) {
                $product = $products->get($item['product_id']);

                if (! $product->is_active) {
                    throw ValidationException::withMessages([
                        'items' => "Produk '{$product->name}' sedang tidak aktif.",
                    ]);
                }

                if ($product->stock < $item['quantity']) {
                    throw ValidationException::withMessages([
                        'items' => "Stok '{$product->name}' tidak mencukupi.",
                    ]);
                }

                $lineTotal = (float) $product->price * $item['quantity'];
                $subtotal += $lineTotal;

                $items[] = [
                    'product' => $product,
                    'quantity' => $item['quantity'],
                    'line_total' => $lineTotal,
                ];
            }

            $voucher = $this->resolveVoucher($team, $data['voucher_code'] ?? null, $subtotal);
            $discountTotal = $voucher?->discountFor($subtotal) ?? 0.0;
            $grandTotal = max($subtotal - $discountTotal, 0);
            $paidAmount = (float) $data['paid_amount'];
            $changeAmount = max($paidAmount - $grandTotal, 0);
            $isPaid = $paidAmount >= $grandTotal;

            $transaction = Transaction::create([
                'team_id' => $team->id,
                'user_id' => $cashier->id,
                'voucher_id' => $voucher?->id,
                'invoice_number' => $this->generateInvoiceNumber($team),
                'customer_name' => $data['customer_name'] ?? null,
                'status' => $isPaid ? Transaction::STATUS_COMPLETED : Transaction::STATUS_PENDING,
                'payment_status' => $isPaid ? Transaction::PAYMENT_STATUS_PAID : Transaction::PAYMENT_STATUS_PARTIAL,
                'payment_method' => $data['payment_method'],
                'subtotal' => $subtotal,
                'discount_total' => $discountTotal,
                'tax_total' => 0,
                'grand_total' => $grandTotal,
                'paid_amount' => $paidAmount,
                'change_amount' => $changeAmount,
                'note' => $data['note'] ?? null,
                'paid_at' => $isPaid ? now() : null,
            ]);

            foreach ($items as $item) {
                $product = $item['product'];

                $transaction->items()->create([
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'product_sku' => $product->sku,
                    'unit_price' => $product->price,
                    'quantity' => $item['quantity'],
                    'discount_total' => 0,
                    'line_total' => $item['line_total'],
                ]);

                $this->adjustProductStockAction->execute($product, $cashier, [
                    'type' => ProductStockMovement::TYPE_OUT,
                    'quantity' => $item['quantity'],
                    'note' => "Penjualan POS {$transaction->invoice_number}",
                    'reference_type' => Transaction::class,
                    'reference_id' => $transaction->id,
                ]);
            }

            if ($voucher) {
                $voucher->increment('used_count');
            }

            return $transaction->load(['items', 'cashier:id,name', 'voucher:id,code,name']);
        });
    }

    private function resolveVoucher(Team $team, ?string $code, float $subtotal): ?Voucher
    {
        if (! $code) {
            return null;
        }

        $voucher = Voucher::where('team_id', $team->id)
            ->where('code', strtoupper($code))
            ->first();

        if (! $voucher || ! $voucher->isUsableFor($subtotal)) {
            throw ValidationException::withMessages([
                'voucher_code' => 'Voucher tidak valid atau tidak memenuhi syarat transaksi.',
            ]);
        }

        return $voucher;
    }

    private function generateInvoiceNumber(Team $team): string
    {
        $prefix = 'POS-'.now()->format('Ymd').'-';
        $count = Transaction::where('team_id', $team->id)
            ->where('invoice_number', 'like', $prefix.'%')
            ->count() + 1;

        return $prefix.str_pad((string) $count, 4, '0', STR_PAD_LEFT);
    }
}
