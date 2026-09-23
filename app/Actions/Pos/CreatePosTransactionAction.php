<?php

namespace App\Actions\Pos;

use App\Actions\Customer\EarnCustomerPointsAction;
use App\Actions\Customer\RedeemCustomerPointsAction;
use App\Actions\ProductStock\AdjustProductStockAction;
use App\Models\CashierShift;
use App\Models\Customer;
use App\Models\DiningTable;
use App\Models\InventorySerial;
use App\Models\Product;
use App\Models\ProductPackage;
use App\Models\ProductPromotion;
use App\Models\ProductStockMovement;
use App\Models\ProductUnit;
use App\Models\Team;
use App\Models\Transaction;
use App\Models\TransactionItem;
use App\Models\TransactionPayment;
use App\Models\User;
use App\Models\Voucher;
use App\Support\DocumentNumberGenerator;
use App\Support\PaymentStatusResolver;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class CreatePosTransactionAction
{
    public function __construct(
        private AdjustProductStockAction $adjustProductStockAction,
        private EarnCustomerPointsAction $earnCustomerPointsAction,
        private RedeemCustomerPointsAction $redeemCustomerPointsAction,
    ) {}

    public function execute(Team $team, User $cashier, array $data): Transaction
    {
        return DB::transaction(function () use ($team, $cashier, $data) {
            $cartItems = collect($data['items'])
                ->map(fn (array $item) => [
                    'item_type' => $item['item_type'] ?? TransactionItem::ITEM_TYPE_PRODUCT,
                    'item_id' => (int) ($item['item_id'] ?? $item['product_id']),
                    'quantity' => (int) $item['quantity'],
                    'unit_id' => isset($item['unit_id']) ? (int) $item['unit_id'] : null,
                    'inventory_serial_ids' => collect($item['inventory_serial_ids'] ?? [])->map(fn ($id) => (int) $id)->all(),
                ])
                ->groupBy(fn (array $item) => "{$item['item_type']}:{$item['item_id']}:".($item['unit_id'] ?? 'base'))
                ->map(fn (Collection $items) => [
                    'item_type' => $items->first()['item_type'],
                    'item_id' => $items->first()['item_id'],
                    'quantity' => $items->sum('quantity'),
                    'unit_id' => $items->first()['unit_id'],
                    'inventory_serial_ids' => $items->pluck('inventory_serial_ids')->flatten()->unique()->values()->all(),
                ])
                ->values();

            $subtotal = 0.0;
            $items = [];
            $stockRequirements = [];

            $products = $this->resolveProducts($team, $cartItems);
            $units = $this->resolveUnits($team, $cartItems);
            $packages = $this->resolvePackages($team, $cartItems);
            $promotions = $this->resolvePromotions($team, $cartItems);

            foreach ($cartItems as $item) {
                $saleItem = match ($item['item_type']) {
                    TransactionItem::ITEM_TYPE_PRODUCT => $this->buildProductLine($products, $units, $item),
                    TransactionItem::ITEM_TYPE_PACKAGE => $this->buildPackageLine($packages, $item),
                    TransactionItem::ITEM_TYPE_PROMOTION => $this->buildPromotionLine($promotions, $item),
                    default => throw ValidationException::withMessages([
                        'items' => 'Jenis item transaksi tidak valid.',
                    ]),
                };

                foreach ($saleItem['stock_requirements'] as $productId => $quantity) {
                    $stockRequirements[$productId] = ($stockRequirements[$productId] ?? 0) + $quantity;
                }

                $lineTotal = $saleItem['unit_price'] * $item['quantity'];
                $subtotal += $lineTotal;

                $items[] = [
                    'item_type' => $item['item_type'],
                    'item_id' => $item['item_id'],
                    'product_id' => $saleItem['product_id'],
                    'name' => $saleItem['name'],
                    'sku' => $saleItem['sku'],
                    'unit_price' => $saleItem['unit_price'],
                    'quantity' => $item['quantity'],
                    'product_unit_id' => $saleItem['product_unit_id'],
                    'unit_name' => $saleItem['unit_name'],
                    'unit_conversion' => $saleItem['unit_conversion'],
                    'base_quantity' => $saleItem['base_quantity'],
                    'line_total' => $lineTotal,
                    'inventory_serial_ids' => $item['inventory_serial_ids'],
                ];
            }

            $stockProducts = $this->lockAndValidateStock($team, $stockRequirements);
            $serialsByProduct = $this->lockAndValidateSerials($team, $stockProducts, $stockRequirements, $items);
            $voucher = $this->resolveVoucher($team, $data['voucher_code'] ?? null, $subtotal);
            $customer = $this->resolveCustomer($team, $data['customer_id'] ?? null);
            $diningTable = $this->resolveDiningTable($team, $data['dining_table_id'] ?? null);
            $voucherDiscount = $voucher?->discountFor($subtotal) ?? 0.0;
            $requestedPoints = max((int) ($data['points_to_redeem'] ?? 0), 0);
            $maxRedeemablePoints = (int) floor(max($subtotal - $voucherDiscount, 0) / max((int) config('loyalty.point_value'), 1));
            $pointsRedeemed = min($requestedPoints, $maxRedeemablePoints);

            if ($requestedPoints > 0 && ! $customer) {
                throw ValidationException::withMessages(['points_to_redeem' => 'Pilih pelanggan sebelum menukar poin.']);
            }
            if ($customer && $requestedPoints > (int) $customer->points_balance) {
                throw ValidationException::withMessages(['points_to_redeem' => 'Saldo poin pelanggan tidak mencukupi.']);
            }

            $pointsDiscount = $this->redeemCustomerPointsAction->discount($pointsRedeemed, max($subtotal - $voucherDiscount, 0));
            $discountTotal = $voucherDiscount + $pointsDiscount;
            $taxableAmount = max($subtotal - $discountTotal, 0);
            $taxTotal = round($taxableAmount * ((float) $team->tax_rate / 100), 2);
            $grandTotal = $taxableAmount + $taxTotal;
            $paidAmount = (float) $data['paid_amount'];
            $this->validatePaidAmount($paidAmount, $diningTable !== null);

            $changeAmount = max($paidAmount - $grandTotal, 0);
            ['status' => $status, 'paymentStatus' => $paymentStatus] = PaymentStatusResolver::resolve($grandTotal, $paidAmount);
            $cashierShift = CashierShift::query()
                ->where('team_id', $team->id)
                ->where('user_id', $cashier->id)
                ->where('status', CashierShift::STATUS_OPEN)
                ->first();

            $transaction = Transaction::create([
                'team_id' => $team->id,
                'user_id' => $cashier->id,
                'cashier_shift_id' => $cashierShift?->id,
                'voucher_id' => $voucher?->id,
                'customer_id' => $customer?->id,
                'dining_table_id' => $diningTable?->id,
                'invoice_number' => DocumentNumberGenerator::generate('POS', 'transactions', 'invoice_number', $team->id),
                'customer_name' => $customer?->name ?? ($data['customer_name'] ?? null),
                'customer_phone' => $customer?->phone ?? ($data['customer_phone'] ?? null),
                'customer_email' => $customer?->email ?? ($data['customer_email'] ?? null),
                'status' => $status,
                'payment_status' => $paymentStatus,
                'payment_method' => $data['payment_method'],
                'subtotal' => $subtotal,
                'discount_total' => $discountTotal,
                'points_redeemed' => $pointsRedeemed,
                'points_discount_total' => $pointsDiscount,
                'tax_total' => $taxTotal,
                'grand_total' => $grandTotal,
                'paid_amount' => $paidAmount,
                'change_amount' => $changeAmount,
                'note' => $data['note'] ?? null,
                'paid_at' => $paymentStatus === Transaction::PAYMENT_STATUS_UNPAID ? null : now(),
            ]);

            if ($paidAmount > 0) {
                TransactionPayment::create([
                    'team_id' => $team->id,
                    'transaction_id' => $transaction->id,
                    'cashier_shift_id' => $cashierShift?->id,
                    'user_id' => $cashier->id,
                    'payment_method' => $data['payment_method'],
                    'amount' => min($paidAmount, $grandTotal),
                    'tendered_amount' => $paidAmount,
                    'change_amount' => $changeAmount,
                    'received_at' => now(),
                ]);
            }

            foreach ($items as $item) {
                $transactionItem = $transaction->items()->create($this->transactionItemPayload($item));
                foreach ($item['inventory_serial_ids'] as $serialId) {
                    $serial = $serialsByProduct->get($item['product_id'])?->get($serialId);
                    if (! $serial) {
                        continue;
                    }
                    $transactionItem->serials()->create([
                        'inventory_serial_id' => $serial->id,
                        'serial_number' => $serial->serial_number,
                    ]);
                    $serial->update(['status' => InventorySerial::STATUS_SOLD]);
                }
            }

            foreach ($stockRequirements as $productId => $quantity) {
                $product = $stockProducts->get($productId);
                $this->adjustProductStockAction->execute($product, $cashier, [
                    'type' => ProductStockMovement::TYPE_OUT,
                    'quantity' => $quantity,
                    'note' => "Penjualan POS {$transaction->invoice_number}",
                    'reference_type' => Transaction::class,
                    'reference_id' => $transaction->id,
                ]);
            }

            if ($voucher) {
                $voucher->increment('used_count');
            }

            if ($customer && $pointsRedeemed > 0) {
                $this->redeemCustomerPointsAction->execute($customer, $transaction, $pointsRedeemed);
            }

            if ($customer) {
                $this->earnCustomerPointsAction->execute($customer->fresh(), $transaction);
            }

            if ($diningTable) {
                $diningTable->update([
                    'status' => $paymentStatus === Transaction::PAYMENT_STATUS_PAID
                        ? DiningTable::STATUS_AVAILABLE
                        : DiningTable::STATUS_OCCUPIED,
                ]);
            }

            return $transaction->load(['items', 'cashier:id,name', 'voucher:id,code,name', 'customer', 'diningTable']);
        });
    }

    private function resolveProducts(Team $team, Collection $cartItems): Collection
    {
        $ids = $cartItems
            ->where('item_type', TransactionItem::ITEM_TYPE_PRODUCT)
            ->pluck('item_id');

        return Product::where('team_id', $team->id)
            ->whereIn('id', $ids)
            ->get()
            ->keyBy('id');
    }

    private function validatePaidAmount(float $paidAmount, bool $isTableOrder): void
    {
        if ($paidAmount < 0 || ($paidAmount === 0.0 && ! $isTableOrder)) {
            throw ValidationException::withMessages([
                'paid_amount' => $isTableOrder ? 'Jumlah bayar tidak boleh negatif.' : 'Jumlah bayar wajib diisi.',
            ]);
        }
    }

    private function resolveCustomer(Team $team, mixed $customerId): ?Customer
    {
        if (! $customerId) {
            return null;
        }

        return Customer::query()->where('team_id', $team->id)->lockForUpdate()->findOrFail($customerId);
    }

    private function resolveDiningTable(Team $team, mixed $tableId): ?DiningTable
    {
        if (! $tableId) {
            return null;
        }

        $table = DiningTable::query()->where('team_id', $team->id)->lockForUpdate()->findOrFail($tableId);

        if ($table->status === DiningTable::STATUS_OCCUPIED) {
            throw ValidationException::withMessages(['dining_table_id' => 'Meja sedang memiliki pesanan aktif.']);
        }

        return $table;
    }

    private function transactionItemPayload(array $item): array
    {
        $payload = [
            'product_id' => $item['product_id'],
            'product_unit_id' => $item['product_unit_id'],
            'product_name' => $item['name'],
            'product_sku' => $item['sku'],
            'unit_name' => $item['unit_name'],
            'unit_conversion' => $item['unit_conversion'],
            'unit_price' => $item['unit_price'],
            'quantity' => $item['quantity'],
            'base_quantity' => $item['base_quantity'],
            'discount_total' => 0,
            'line_total' => $item['line_total'],
        ];

        if ($this->transactionItemsHaveSaleItemColumns()) {
            $payload['item_type'] = $item['item_type'];
            $payload['item_reference_id'] = $item['item_id'];
        }

        return $payload;
    }

    private function transactionItemsHaveSaleItemColumns(): bool
    {
        static $hasColumns = null;

        if ($hasColumns === null) {
            $hasColumns = Schema::hasColumn('transaction_items', 'item_type')
                && Schema::hasColumn('transaction_items', 'item_reference_id');
        }

        return $hasColumns;
    }

    private function resolvePackages(Team $team, Collection $cartItems): Collection
    {
        $ids = $cartItems
            ->where('item_type', TransactionItem::ITEM_TYPE_PACKAGE)
            ->pluck('item_id');

        return ProductPackage::where('team_id', $team->id)
            ->whereIn('id', $ids)
            ->with('items.product:id,team_id,name,sku,is_active')
            ->get()
            ->keyBy('id');
    }

    private function resolveUnits(Team $team, Collection $cartItems): Collection
    {
        $ids = $cartItems->where('item_type', TransactionItem::ITEM_TYPE_PRODUCT)->pluck('unit_id')->filter();

        return ProductUnit::query()
            ->where('team_id', $team->id)
            ->whereIn('id', $ids)
            ->get()
            ->keyBy('id');
    }

    private function resolvePromotions(Team $team, Collection $cartItems): Collection
    {
        $ids = $cartItems
            ->where('item_type', TransactionItem::ITEM_TYPE_PROMOTION)
            ->pluck('item_id');

        return ProductPromotion::where('team_id', $team->id)
            ->whereIn('id', $ids)
            ->with([
                'triggers.product:id,team_id,name,sku,price,is_active',
                'rewards.product:id,team_id,name,sku,is_active',
            ])
            ->get()
            ->keyBy('id');
    }

    private function buildProductLine(Collection $products, Collection $units, array $item): array
    {
        /** @var Product|null $product */
        $product = $products->get($item['item_id']);

        if (! $product) {
            throw ValidationException::withMessages([
                'items' => 'Sebagian produk tidak ditemukan pada tim ini.',
            ]);
        }

        if (! $product->is_active) {
            throw ValidationException::withMessages([
                'items' => "Produk '{$product->name}' sedang tidak aktif.",
            ]);
        }

        /** @var ProductUnit|null $unit */
        $unit = $item['unit_id'] ? $units->get($item['unit_id']) : null;
        if ($item['unit_id'] && (! $unit || $unit->product_id !== $product->id || ! $unit->is_active)) {
            throw ValidationException::withMessages(['items' => "Satuan penjualan '{$product->name}' tidak valid."]);
        }

        $conversion = $unit?->conversion_quantity ?? 1;

        return [
            'product_id' => $product->id,
            'product_unit_id' => $unit?->id,
            'name' => $product->name,
            'sku' => $product->sku,
            'unit_name' => $unit?->abbreviation ?? $product->base_unit,
            'unit_conversion' => $conversion,
            'base_quantity' => $item['quantity'] * $conversion,
            'unit_price' => (float) ($unit?->selling_price ?? $product->price),
            'stock_requirements' => [$product->id => $item['quantity'] * $conversion],
        ];
    }

    private function buildPackageLine(Collection $packages, array $item): array
    {
        /** @var ProductPackage|null $package */
        $package = $packages->get($item['item_id']);

        if (! $package) {
            throw ValidationException::withMessages([
                'items' => 'Sebagian paket produk tidak ditemukan pada tim ini.',
            ]);
        }

        if (! $package->is_active) {
            throw ValidationException::withMessages([
                'items' => "Paket '{$package->name}' sedang tidak aktif.",
            ]);
        }

        if ($package->items->isEmpty()) {
            throw ValidationException::withMessages([
                'items' => "Paket '{$package->name}' belum memiliki komponen produk.",
            ]);
        }

        $requirements = [];
        foreach ($package->items as $packageItem) {
            if (! $packageItem->product?->is_active) {
                throw ValidationException::withMessages([
                    'items' => "Komponen paket '{$package->name}' tidak aktif atau tidak ditemukan.",
                ]);
            }

            $requirements[$packageItem->product_id] = ($requirements[$packageItem->product_id] ?? 0)
                + ((int) $packageItem->quantity * $item['quantity']);
        }

        return [
            'product_id' => null,
            'product_unit_id' => null,
            'name' => $package->name,
            'sku' => $package->sku,
            'unit_name' => 'paket',
            'unit_conversion' => 1,
            'base_quantity' => $item['quantity'],
            'unit_price' => (float) $package->base_price,
            'stock_requirements' => $requirements,
        ];
    }

    private function buildPromotionLine(Collection $promotions, array $item): array
    {
        /** @var ProductPromotion|null $promotion */
        $promotion = $promotions->get($item['item_id']);

        if (! $promotion) {
            throw ValidationException::withMessages([
                'items' => 'Sebagian promosi produk tidak ditemukan pada tim ini.',
            ]);
        }

        if (! $promotion->is_active) {
            throw ValidationException::withMessages([
                'items' => "Promosi '{$promotion->name}' sedang tidak aktif.",
            ]);
        }

        if ($promotion->triggers->isEmpty() || $promotion->rewards->isEmpty()) {
            throw ValidationException::withMessages([
                'items' => "Promosi '{$promotion->name}' belum memiliki syarat atau reward.",
            ]);
        }

        $requirements = [];
        $unitPrice = 0.0;

        foreach ($promotion->triggers as $trigger) {
            if (! $trigger->product?->is_active) {
                throw ValidationException::withMessages([
                    'items' => "Produk syarat promosi '{$promotion->name}' tidak aktif atau tidak ditemukan.",
                ]);
            }

            $requirements[$trigger->product_id] = ($requirements[$trigger->product_id] ?? 0)
                + ((int) $trigger->min_quantity * $item['quantity']);
            $unitPrice += (float) $trigger->product->price * (int) $trigger->min_quantity;
        }

        foreach ($promotion->rewards as $reward) {
            if (! $reward->product?->is_active) {
                throw ValidationException::withMessages([
                    'items' => "Produk reward promosi '{$promotion->name}' tidak aktif atau tidak ditemukan.",
                ]);
            }

            $requirements[$reward->product_id] = ($requirements[$reward->product_id] ?? 0)
                + ((int) $reward->quantity * $item['quantity']);
            $unitPrice += (float) $reward->extra_charge * (int) $reward->quantity;
        }

        return [
            'product_id' => null,
            'product_unit_id' => null,
            'name' => $promotion->name,
            'sku' => 'PROMO-'.$promotion->id,
            'unit_name' => 'promo',
            'unit_conversion' => 1,
            'base_quantity' => $item['quantity'],
            'unit_price' => $unitPrice,
            'stock_requirements' => $requirements,
        ];
    }

    private function lockAndValidateStock(Team $team, array $stockRequirements): Collection
    {
        if ($stockRequirements === []) {
            return collect();
        }

        $products = Product::where('team_id', $team->id)
            ->whereIn('id', array_keys($stockRequirements))
            ->lockForUpdate()
            ->get()
            ->keyBy('id');

        if ($products->count() !== count($stockRequirements)) {
            throw ValidationException::withMessages([
                'items' => 'Sebagian produk komponen transaksi tidak ditemukan pada tim ini.',
            ]);
        }

        foreach ($stockRequirements as $productId => $quantity) {
            /** @var Product $product */
            $product = $products->get($productId);

            if (! $product->is_active) {
                throw ValidationException::withMessages([
                    'items' => "Produk '{$product->name}' sedang tidak aktif.",
                ]);
            }

            if ($product->stock < $quantity) {
                throw ValidationException::withMessages([
                    'items' => "Stok '{$product->name}' tidak mencukupi.",
                ]);
            }
        }

        return $products;
    }

    private function lockAndValidateSerials(Team $team, Collection $products, array $stockRequirements, array $items): Collection
    {
        $selectedByProduct = collect($items)
            ->filter(fn (array $item) => $item['product_id'] !== null)
            ->groupBy('product_id')
            ->map(fn (Collection $rows) => $rows->pluck('inventory_serial_ids')->flatten()->map(fn ($id) => (int) $id)->unique()->values());
        $resolved = collect();

        foreach ($stockRequirements as $productId => $quantity) {
            $product = $products->get($productId);
            if (! $product->tracks_serials) {
                continue;
            }

            $selectedIds = $selectedByProduct->get($productId, collect());
            if ($selectedIds->count() !== $quantity) {
                throw ValidationException::withMessages([
                    'items' => "Pilih tepat {$quantity} nomor serial untuk '{$product->name}'.",
                ]);
            }

            $serials = InventorySerial::query()
                ->where('team_id', $team->id)
                ->where('product_id', $productId)
                ->where('status', InventorySerial::STATUS_IN_STOCK)
                ->whereIn('id', $selectedIds)
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            if ($serials->count() !== $quantity) {
                throw ValidationException::withMessages(['items' => "Serial '{$product->name}' tidak valid atau sudah tidak tersedia."]);
            }

            $resolved->put($productId, $serials);
        }

        return $resolved;
    }

    private function resolveVoucher(Team $team, ?string $code, float $subtotal): ?Voucher
    {
        if (! $code) {
            return null;
        }

        $voucher = Voucher::where('team_id', $team->id)
            ->where('code', strtoupper($code))
            ->lockForUpdate()
            ->first();

        if (! $voucher || ! $voucher->isUsableFor($subtotal)) {
            throw ValidationException::withMessages([
                'voucher_code' => 'Voucher tidak valid atau tidak memenuhi syarat transaksi.',
            ]);
        }

        return $voucher;
    }
}
