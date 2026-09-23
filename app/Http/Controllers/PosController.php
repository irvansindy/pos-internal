<?php

namespace App\Http\Controllers;

use App\Actions\Pos\CreatePosTransactionAction;
use App\Actions\Pos\ProcessTransactionPaymentAction;
use App\Actions\Pos\VoidTransactionAction;
use App\Actions\ProductPromotion\EvaluateCartPromotionsAction;
use App\Http\Requests\Pos\CreatePosTransactionRequest;
use App\Http\Requests\Pos\EvaluateCartPromotionsRequest;
use App\Http\Requests\Pos\ProcessPaymentRequest;
use App\Http\Requests\Pos\SearchProductsRequest;
use App\Http\Requests\Pos\ValidateVoucherRequest;
use App\Http\Requests\Pos\VoidTransactionRequest;
use App\Models\CashierShift;
use App\Models\Product;
use App\Models\ProductPackage;
use App\Models\ProductPromotion;
use App\Models\ProductUnit;
use App\Models\Transaction;
use App\Models\TransactionItem;
use App\Models\Voucher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PosController extends Controller
{
    public function __construct(
        private CreatePosTransactionAction $createPosTransactionAction,
        private ProcessTransactionPaymentAction $processTransactionPaymentAction,
        private VoidTransactionAction $voidTransactionAction,
        private EvaluateCartPromotionsAction $evaluateCartPromotionsAction,
    ) {}

    public function index(Request $request): Response
    {
        $team = $request->user()->currentTeam;
        $authUser = $request->user();

        abort_unless($team->members()->where('users.id', $authUser->id)->exists(), 403);

        setPermissionsTeamId($team->id);

        $products = $team->products()
            ->select(['id', 'team_id', 'category_id', 'sku', 'barcode', 'base_unit', 'name', 'variant_name', 'image_path', 'price', 'stock', 'min_stock', 'tracks_batches', 'tracks_serials'])
            ->with(['category:id,name', 'units' => fn ($query) => $query->where('is_active', true)->orderBy('conversion_quantity'), 'inventorySerials' => fn ($query) => $query->where('status', 'in_stock')->orderBy('serial_number')])
            ->withSum(['inventoryBatches as sellable_batch_stock' => fn ($query) => $query->where('quantity', '>', 0)->where(fn ($query) => $query->whereNull('expires_at')->orWhereDate('expires_at', '>=', today()))], 'quantity')
            ->where('is_active', true)
            ->where('stock', '>', 0)
            ->orderBy('name')
            ->limit(40)
            ->get();

        $packages = $team->productPackages()
            ->with(['category:id,name', 'items.product:id,name,sku,stock,is_active'])
            ->where('is_active', true)
            ->orderBy('name')
            ->limit(40)
            ->get(['id', 'team_id', 'category_id', 'sku', 'name', 'image_path', 'base_price', 'is_active']);

        $promotions = $team->productPromotions()
            ->where('is_active', true)
            ->with([
                'triggers.product:id,name,sku,price,stock,is_active',
                'rewards.product:id,name,sku,stock,is_active',
            ])
            ->orderBy('name')
            ->limit(40)
            ->get(['id', 'team_id', 'name', 'image_path', 'type', 'is_active', 'starts_at', 'ends_at']);

        $recentTransactions = $team->transactions()
            ->with([
                'cashier:id,name',
                'items:id,transaction_id,product_name,product_sku,unit_name,unit_conversion,base_quantity,unit_price,quantity,discount_total,line_total',
                'voucher:id,code,name,type,value',
            ])
            ->latest()
            ->limit(8)
            ->get([
                'id',
                'voucher_id',
                'invoice_number',
                'customer_name',
                'customer_phone',
                'customer_email',
                'customer_id',
                'dining_table_id',
                'status',
                'payment_status',
                'payment_method',
                'subtotal',
                'discount_total',
                'points_redeemed',
                'points_discount_total',
                'tax_total',
                'grand_total',
                'paid_amount',
                'change_amount',
                'created_at',
                'user_id',
                'void_reason',
            ]);

        $vouchers = $team->vouchers()
            ->where('is_active', true)
            ->where(function ($query) {
                $query->whereNull('starts_at')
                    ->orWhere('starts_at', '<=', now());
            })
            ->where(function ($query) {
                $query->whereNull('expires_at')
                    ->orWhere('expires_at', '>=', now());
            })
            ->where(function ($query) {
                $query->whereNull('usage_limit')
                    ->orWhereColumn('used_count', '<', 'usage_limit');
            })
            ->orderBy('code')
            ->get(['id', 'code', 'name', 'type', 'value', 'min_purchase', 'max_discount']);

        return Inertia::render('pos/index', [
            'products' => $this->formatSaleItems($products, $packages, $promotions)->take(40)->values(),
            'recentTransactions' => $recentTransactions,
            'vouchers' => $vouchers,
            'teamSlug' => $team->slug,
            'paymentMethods' => [
                ['value' => 'cash', 'label' => 'Tunai'],
                ['value' => 'qris', 'label' => 'QRIS'],
                ['value' => 'card', 'label' => 'Kartu'],
                ['value' => 'transfer', 'label' => 'Transfer'],
            ],
            'canApplyVoucher' => $authUser->canOnCurrentTeam('voucher.apply'),
            'taxRate' => (float) $team->tax_rate,
            'canVoid' => $authUser->canOnCurrentTeam('transaction.void'),
            'customers' => $team->customers()->orderBy('name')->limit(100)->get(['id', 'name', 'phone', 'email', 'points_balance']),
            'diningTables' => $team->diningTables()->orderBy('name')->get(['id', 'name', 'capacity', 'status']),
            'loyaltyPointValue' => (int) config('loyalty.point_value'),
            'activeCashierShift' => CashierShift::query()
                ->where('team_id', $team->id)
                ->where('user_id', $authUser->id)
                ->where('status', CashierShift::STATUS_OPEN)
                ->first(['id', 'opened_at']),
            'canManageCashierShift' => $authUser->canOnCurrentTeam('cashier-shift.open'),
        ]);
    }

    public function searchProducts(SearchProductsRequest $request): JsonResponse
    {
        $team = $request->user()->currentTeam;
        $search = trim((string) $request->validated('search', ''));

        $products = Product::query()
            ->select(['id', 'team_id', 'category_id', 'sku', 'barcode', 'base_unit', 'name', 'variant_name', 'image_path', 'price', 'stock', 'min_stock', 'tracks_batches', 'tracks_serials'])
            ->where('team_id', $team->id)
            ->with(['category:id,name', 'units' => fn ($query) => $query->where('is_active', true)->orderBy('conversion_quantity'), 'inventorySerials' => fn ($query) => $query->where('status', 'in_stock')->orderBy('serial_number')])
            ->withSum(['inventoryBatches as sellable_batch_stock' => fn ($query) => $query->where('quantity', '>', 0)->where(fn ($query) => $query->whereNull('expires_at')->orWhereDate('expires_at', '>=', today()))], 'quantity')
            ->where('is_active', true)
            ->where('stock', '>', 0)
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($query) use ($search) {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('sku', 'like', "%{$search}%")
                        ->orWhere('barcode', $search)
                        ->orWhereHas('units', fn ($query) => $query->where('barcode', $search));
                });
            })
            ->orderBy('name')
            ->limit(30)
            ->get();

        $packages = ProductPackage::where('team_id', $team->id)
            ->with(['category:id,name', 'items.product:id,name,sku,stock,is_active'])
            ->where('is_active', true)
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($query) use ($search) {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('sku', 'like', "%{$search}%")
                        ->orWhereHas('category', fn ($query) => $query->where('name', 'like', "%{$search}%"));
                });
            })
            ->orderBy('name')
            ->limit(30)
            ->get(['id', 'team_id', 'category_id', 'sku', 'name', 'image_path', 'base_price', 'is_active']);

        $promotions = ProductPromotion::where('team_id', $team->id)
            ->where('is_active', true)
            ->with([
                'triggers.product:id,name,sku,price,stock,is_active',
                'rewards.product:id,name,sku,stock,is_active',
            ])
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($query) use ($search) {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('type', 'like', "%{$search}%");
                });
            })
            ->orderBy('name')
            ->limit(30)
            ->get(['id', 'team_id', 'name', 'image_path', 'type', 'is_active', 'starts_at', 'ends_at']);

        return response()->json([
            'products' => $this->formatSaleItems($products, $packages, $promotions)->take(30)->values(),
        ]);
    }

    /**
     * Deteksi promosi BXGY yang aktif dari isi keranjang saat ini —
     * kasir tidak perlu tahu/mencari nama promosinya secara manual.
     * Mengembalikan promosi dalam bentuk PosItem (sama seperti hasil
     * pencarian katalog) supaya frontend bisa langsung addToCart() tanpa
     * perlu bentuk data yang berbeda.
     */
    public function evaluatePromotions(EvaluateCartPromotionsRequest $request): JsonResponse
    {
        $team = $request->user()->currentTeam;

        $results = $this->evaluateCartPromotionsAction->execute($team, $request->validated('items', []));

        return response()->json([
            'promotions' => $results->map(fn (array $result) => [
                ...$this->formatPromotionForPos($result['promotion']),
                'suggested_quantity' => $result['times'],
            ])->values(),
        ]);
    }

    public function validateVoucher(ValidateVoucherRequest $request): JsonResponse
    {
        $team = $request->user()->currentTeam;
        $validated = $request->validated();
        $subtotal = (float) $validated['subtotal'];

        $voucher = Voucher::where('team_id', $team->id)
            ->where('code', strtoupper($validated['voucher_code']))
            ->first();

        if (! $voucher || ! $voucher->isUsableFor($subtotal)) {
            return response()->json([
                'valid' => false,
                'message' => 'Voucher tidak valid atau tidak memenuhi syarat transaksi.',
            ], 422);
        }

        return response()->json([
            'valid' => true,
            'voucher' => $voucher->only(['id', 'code', 'name', 'type', 'value']),
            'discount_total' => $voucher->discountFor($subtotal),
            'message' => "Voucher {$voucher->code} berhasil digunakan.",
        ]);
    }

    public function createTransaction(CreatePosTransactionRequest $request)
    {
        $team = $request->user()->currentTeam;
        $authUser = $request->user();

        abort_unless($team->members()->where('users.id', $authUser->id)->exists(), 403);

        setPermissionsTeamId($team->id);

        if ((float) $request->validated('paid_amount') > 0) {
            $this->requireActiveCashierShift($team->id, $authUser->id);
        }

        $transaction = $this->createPosTransactionAction->execute($team, $authUser, $request->validated());

        Inertia::flash('success', "Transaksi {$transaction->invoice_number} berhasil dibuat.");

        return back();
    }

    public function processPayment(ProcessPaymentRequest $request)
    {
        $team = $request->user()->currentTeam;
        $transaction = Transaction::where('team_id', $team->id)
            ->where('id', $request->route('transaction'))
            ->firstOrFail();

        $this->requireActiveCashierShift($team->id, $request->user()->id);

        $this->processTransactionPaymentAction->execute($team, $transaction, $request->validated(), $request->user());

        Inertia::flash('success', "Pembayaran {$transaction->invoice_number} berhasil diperbarui.");

        return back();
    }

    public function voidTransaction(VoidTransactionRequest $request, string $current_team, Transaction $transaction)
    {
        $team = $request->user()->currentTeam;
        $authUser = $request->user();

        abort_unless($authUser->canOnCurrentTeam('transaction.void'), 403, 'Anda tidak memiliki izin untuk membatalkan transaksi.');

        $transaction = $this->voidTransactionAction->execute(
            $team,
            $transaction,
            $authUser,
            $request->validated('reason'),
        );

        Inertia::flash('success', "Transaksi {$transaction->invoice_number} dibatalkan, stok sudah dikembalikan.");

        return back();
    }

    private function formatSaleItems(Collection $products, Collection $packages, Collection $promotions): Collection
    {
        return $products
            ->flatMap(fn (Product $product) => collect([$this->formatProductForPos($product)])
                ->concat($product->units->map(fn (ProductUnit $unit) => $this->formatProductForPos($product, $unit))))
            ->concat($packages->map(fn (ProductPackage $package) => $this->formatPackageForPos($package)))
            ->concat($promotions->map(fn (ProductPromotion $promotion) => $this->formatPromotionForPos($promotion)))
            ->filter(fn (array $item) => $item['stock'] > 0)
            ->sortBy([
                ['item_type', 'asc'],
                ['name', 'asc'],
            ])
            ->values();
    }

    private function requireActiveCashierShift(int $teamId, int $userId): CashierShift
    {
        $shift = CashierShift::query()
            ->where('team_id', $teamId)
            ->where('user_id', $userId)
            ->where('status', CashierShift::STATUS_OPEN)
            ->first();

        if (! $shift) {
            throw ValidationException::withMessages([
                'cashier_shift' => 'Buka shift kasir sebelum menerima pembayaran.',
            ]);
        }

        return $shift;
    }

    private function formatProductForPos(Product $product, ?ProductUnit $unit = null): array
    {
        $conversion = $unit?->conversion_quantity ?? 1;

        $availableStock = $product->tracks_batches
            ? (int) ($product->sellable_batch_stock ?? 0)
            : (int) $product->stock;

        return [
            'id' => $unit ? "{$product->id}:{$unit->id}" : (string) $product->id,
            'item_id' => $product->id,
            'item_type' => TransactionItem::ITEM_TYPE_PRODUCT,
            'unit_id' => $unit?->id,
            'unit_name' => $unit?->abbreviation ?? $product->base_unit,
            'unit_conversion' => $conversion,
            'category_id' => $product->category_id,
            'sku' => $unit?->barcode ?: $product->sku,
            'barcode' => $unit?->barcode ?? $product->barcode,
            'name' => $product->variant_name ? "{$product->name} · {$product->variant_name}" : $product->name,
            'image_url' => $product->image_url,
            'price' => (string) ($unit?->selling_price ?? $product->price),
            'stock' => intdiv($availableStock, $conversion),
            'min_stock' => (int) ceil($product->min_stock / $conversion),
            'tracks_serials' => $product->tracks_serials,
            'available_serials' => $product->inventorySerials->map(fn ($serial) => [
                'id' => $serial->id,
                'serial_number' => $serial->serial_number,
            ])->values(),
            'category' => $product->category,
        ];
    }

    private function formatPackageForPos(ProductPackage $package): array
    {
        return [
            'id' => $package->id,
            'item_id' => $package->id,
            'item_type' => TransactionItem::ITEM_TYPE_PACKAGE,
            'category_id' => $package->category_id,
            'sku' => $package->sku,
            'name' => $package->name,
            'image_url' => $package->image_url,
            'price' => (string) $package->base_price,
            'stock' => $this->availablePackageStock($package),
            'min_stock' => 0,
            'category' => $package->category,
        ];
    }

    private function formatPromotionForPos(ProductPromotion $promotion): array
    {
        return [
            'id' => $promotion->id,
            'item_id' => $promotion->id,
            'item_type' => TransactionItem::ITEM_TYPE_PROMOTION,
            'category_id' => null,
            'sku' => 'PROMO-'.$promotion->id,
            'name' => $promotion->name,
            'image_url' => $promotion->image_url,
            'price' => (string) $this->promotionUnitPrice($promotion),
            'stock' => $this->availablePromotionStock($promotion),
            'min_stock' => 0,
            'category' => ['id' => null, 'name' => 'Promosi'],
        ];
    }

    private function availablePackageStock(ProductPackage $package): int
    {
        if ($package->items->isEmpty()) {
            return 0;
        }

        if ($package->items->contains(fn ($item) => ! $item->product?->is_active || $item->quantity <= 0)) {
            return 0;
        }

        return (int) $package->items
            ->groupBy('product_id')
            ->map(function (Collection $items) {
                $product = $items->first()->product;
                $quantity = $items->sum(fn ($item) => (int) $item->quantity);

                return intdiv((int) $product->stock, $quantity);
            })
            ->min();
    }

    private function availablePromotionStock(ProductPromotion $promotion): int
    {
        $requirements = $promotion->triggers
            ->map(fn ($trigger) => ['product' => $trigger->product, 'quantity' => (int) $trigger->min_quantity])
            ->concat($promotion->rewards->map(fn ($reward) => ['product' => $reward->product, 'quantity' => (int) $reward->quantity]));

        if ($requirements->isEmpty()) {
            return 0;
        }

        if ($requirements->contains(fn (array $requirement) => ! $requirement['product']?->is_active || $requirement['quantity'] <= 0)) {
            return 0;
        }

        return (int) $requirements
            ->groupBy(fn (array $requirement) => $requirement['product']->id)
            ->map(function (Collection $requirements) {
                $product = $requirements->first()['product'];
                $quantity = $requirements->sum('quantity');

                return intdiv((int) $product->stock, $quantity);
            })
            ->min();
    }

    private function promotionUnitPrice(ProductPromotion $promotion): float
    {
        $triggerTotal = $promotion->triggers->sum(
            fn ($trigger) => (float) $trigger->product->price * (int) $trigger->min_quantity
        );
        $rewardTotal = $promotion->rewards->sum(
            fn ($reward) => (float) $reward->extra_charge * (int) $reward->quantity
        );

        return $triggerTotal + $rewardTotal;
    }
}
