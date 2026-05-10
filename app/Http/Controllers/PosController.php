<?php

namespace App\Http\Controllers;

use App\Actions\Pos\CreatePosTransactionAction;
use App\Actions\Pos\ProcessTransactionPaymentAction;
use App\Http\Requests\Pos\CreatePosTransactionRequest;
use App\Http\Requests\Pos\ProcessPaymentRequest;
use App\Http\Requests\Pos\SearchProductsRequest;
use App\Http\Requests\Pos\ValidateVoucherRequest;
use App\Models\Product;
use App\Models\Transaction;
use App\Models\Voucher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PosController extends Controller
{
    public function __construct(
        private CreatePosTransactionAction $createPosTransactionAction,
        private ProcessTransactionPaymentAction $processTransactionPaymentAction,
    ) {}

    public function index(Request $request): Response
    {
        $team = $request->user()->currentTeam;
        $authUser = $request->user();

        abort_unless($team->members()->where('users.id', $authUser->id)->exists(), 403);

        setPermissionsTeamId($team->id);

        $products = $team->products()
            ->with('category:id,name')
            ->where('is_active', true)
            ->where('stock', '>', 0)
            ->orderBy('name')
            ->limit(40)
            ->get(['id', 'category_id', 'sku', 'name', 'price', 'stock', 'min_stock']);

        $recentTransactions = $team->transactions()
            ->with('cashier:id,name')
            ->latest()
            ->limit(8)
            ->get([
                'id',
                'invoice_number',
                'customer_name',
                'status',
                'payment_status',
                'grand_total',
                'paid_amount',
                'change_amount',
                'created_at',
                'user_id',
            ]);

        return Inertia::render('pos/index', [
            'products' => $products,
            'recentTransactions' => $recentTransactions,
            'teamSlug' => $team->slug,
            'paymentMethods' => [
                ['value' => 'cash', 'label' => 'Tunai'],
                ['value' => 'qris', 'label' => 'QRIS'],
                ['value' => 'card', 'label' => 'Kartu'],
                ['value' => 'transfer', 'label' => 'Transfer'],
            ],
            'canApplyVoucher' => $authUser->canOnCurrentTeam('voucher.apply'),
        ]);
    }

    public function searchProducts(SearchProductsRequest $request): JsonResponse
    {
        $team = $request->user()->currentTeam;
        $search = trim((string) $request->validated('search', ''));

        $products = Product::where('team_id', $team->id)
            ->with('category:id,name')
            ->where('is_active', true)
            ->where('stock', '>', 0)
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($query) use ($search) {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('sku', 'like', "%{$search}%");
                });
            })
            ->orderBy('name')
            ->limit(30)
            ->get(['id', 'category_id', 'sku', 'name', 'price', 'stock', 'min_stock']);

        return response()->json([
            'products' => $products,
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

        $this->processTransactionPaymentAction->execute($team, $transaction, $request->validated());

        Inertia::flash('success', "Pembayaran {$transaction->invoice_number} berhasil diperbarui.");

        return back();
    }
}
