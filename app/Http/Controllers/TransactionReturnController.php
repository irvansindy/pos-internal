<?php

namespace App\Http\Controllers;

use App\Actions\ProductStock\AdjustProductStockAction;
use App\Actions\Transaction\CreateTransactionReturnAction;
use App\Models\ProductStockMovement;
use App\Models\TransactionReturn;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TransactionReturnController extends Controller
{
    public function index(Request $request)
    {
        $team = $request->user()?->currentTeam;
        $user = $request->user();

        abort_if(! $team, 403, 'Tidak ada tim aktif.');

        $filters = $request->only(['search', 'status', 'date_from', 'date_to']);
        $query = $team->transactionReturns()
            ->with([
                'transaction:id,invoice_number,customer_name',
                'transactionItem:id,product_name,product_sku,unit_price,quantity',
                'product:id,name,sku,stock',
                'user:id,name',
            ])
            ->latest('created_at');

        $this->applyFilters($query, $filters);

        $transactionItems = $team->transactions()
            ->with(['items' => fn ($query) => $query->whereNotNull('product_id')])
            ->whereHas('items', fn ($query) => $query->whereNotNull('product_id'))
            ->latest('created_at')
            ->limit(100)
            ->get(['id', 'invoice_number', 'customer_name'])
            ->flatMap(fn ($transaction) => $transaction->items->map(fn ($item) => [
                'id' => $item->id,
                'transaction_id' => $transaction->id,
                'invoice_number' => $transaction->invoice_number,
                'customer_name' => $transaction->customer_name,
                'product_name' => $item->product_name,
                'product_sku' => $item->product_sku,
                'unit_price' => $item->unit_price,
                'quantity' => $item->quantity,
            ]))
            ->values();

        return Inertia::render('transactions/returns', [
            'returns' => $query->paginate(10)->withQueryString(),
            'filters' => array_merge([
                'search' => '',
                'status' => '',
                'date_from' => '',
                'date_to' => '',
            ], $filters),
            'summary' => [
                'total' => $team->transactionReturns()->count(),
                'approved' => $team->transactionReturns()->where('status', TransactionReturn::STATUS_APPROVED)->count(),
                'quantity' => $team->transactionReturns()->where('status', TransactionReturn::STATUS_APPROVED)->sum('quantity'),
                'amount' => (string) $team->transactionReturns()->where('status', TransactionReturn::STATUS_APPROVED)->sum('refund_amount'),
            ],
            'transactionItems' => $transactionItems,
            'teamSlug' => $team->slug,
            'canManage' => $user->ownsTeam($team) || $user->canOnCurrentTeam('transaction.return'),
        ]);
    }

    public function store(Request $request, CreateTransactionReturnAction $action)
    {
        $team = $request->user()?->currentTeam;
        $user = $request->user();

        abort_if(! $team, 403, 'Tidak ada tim aktif.');

        $validated = $request->validate([
            'transaction_item_id' => ['required', 'integer'],
            'quantity' => ['required', 'integer', 'min:1'],
            'refund_amount' => ['nullable', 'numeric', 'min:0'],
            'restock' => ['nullable', 'boolean'],
            'status' => ['nullable', 'string', 'in:approved,pending,rejected'],
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);

        $action->execute($team, $user, $validated);

        return back()->with('success', 'Return barang berhasil dicatat.');
    }

    public function destroy(Request $request, string $currentTeam, TransactionReturn $return, AdjustProductStockAction $adjustProductStockAction)
    {
        $team = $request->user()?->currentTeam;
        $user = $request->user();

        abort_if(! $team, 403, 'Tidak ada tim aktif.');
        abort_unless($return->team_id === $team->id, 404);

        $return->loadMissing('product');

        if ($return->restock && $return->status === TransactionReturn::STATUS_APPROVED && $return->product) {
            $adjustProductStockAction->execute($return->product, $user, [
                'type' => ProductStockMovement::TYPE_OUT,
                'quantity' => $return->quantity,
                'note' => "Pembatalan return barang {$return->return_number}",
                'reference_type' => TransactionReturn::class,
                'reference_id' => $return->id,
            ]);
        }

        $return->delete();

        return back()->with('success', 'Return barang berhasil dihapus.');
    }

    private function applyFilters($query, array $filters): void
    {
        $search = trim((string) ($filters['search'] ?? ''));

        if ($search !== '') {
            $query->where(function ($query) use ($search) {
                $query->where('return_number', 'like', "%{$search}%")
                    ->orWhere('reason', 'like', "%{$search}%")
                    ->orWhereHas('transaction', function ($query) use ($search) {
                        $query->where('invoice_number', 'like', "%{$search}%")
                            ->orWhere('customer_name', 'like', "%{$search}%");
                    })
                    ->orWhereHas('transactionItem', function ($query) use ($search) {
                        $query->where('product_name', 'like', "%{$search}%")
                            ->orWhere('product_sku', 'like', "%{$search}%");
                    });
            });
        }

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (! empty($filters['date_from'])) {
            $query->whereDate('created_at', '>=', $filters['date_from']);
        }

        if (! empty($filters['date_to'])) {
            $query->whereDate('created_at', '<=', $filters['date_to']);
        }
    }
}
