<?php

namespace App\Http\Controllers;

use App\Actions\Transaction\CreateTransactionRefundAction;
use App\Models\Transaction;
use App\Models\TransactionRefund;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TransactionRefundController extends Controller
{
    public function index(Request $request)
    {
        $team = $request->user()?->currentTeam;
        $user = $request->user();

        abort_if(! $team, 403, 'Tidak ada tim aktif.');

        $filters = $request->only(['search', 'status', 'method', 'date_from', 'date_to']);
        $query = $team->transactionRefunds()
            ->with(['transaction:id,invoice_number,customer_name,grand_total', 'user:id,name'])
            ->latest('created_at');

        $this->applyFilters($query, $filters);

        $eligibleTransactions = $team->transactions()
            ->where('status', Transaction::STATUS_COMPLETED)
            ->latest('created_at')
            ->limit(100)
            ->get(['id', 'invoice_number', 'customer_name', 'grand_total']);

        return Inertia::render('transactions/refunds', [
            'refunds' => $query->paginate(10)->withQueryString(),
            'filters' => array_merge([
                'search' => '',
                'status' => '',
                'method' => '',
                'date_from' => '',
                'date_to' => '',
            ], $filters),
            'summary' => [
                'total' => $team->transactionRefunds()->count(),
                'approved' => $team->transactionRefunds()->where('status', TransactionRefund::STATUS_APPROVED)->count(),
                'pending' => $team->transactionRefunds()->where('status', TransactionRefund::STATUS_PENDING)->count(),
                'amount' => (string) $team->transactionRefunds()->where('status', TransactionRefund::STATUS_APPROVED)->sum('amount'),
            ],
            'transactions' => $eligibleTransactions,
            'teamSlug' => $team->slug,
            'canManage' => $user->ownsTeam($team) || $user->canOnCurrentTeam('transaction.refund'),
        ]);
    }

    public function store(Request $request, CreateTransactionRefundAction $action)
    {
        $team = $request->user()?->currentTeam;
        $user = $request->user();

        abort_if(! $team, 403, 'Tidak ada tim aktif.');

        $validated = $request->validate([
            'transaction_id' => ['required', 'integer'],
            'amount' => ['required', 'numeric', 'min:1'],
            'method' => ['required', 'string', 'in:cash,card,transfer,qris'],
            'status' => ['nullable', 'string', 'in:approved,pending,rejected'],
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);

        $action->execute($team, $user, $validated);

        return back()->with('success', 'Refund berhasil dicatat.');
    }

    public function destroy(Request $request, string $currentTeam, TransactionRefund $refund)
    {
        $team = $request->user()?->currentTeam;

        abort_if(! $team, 403, 'Tidak ada tim aktif.');
        abort_unless($refund->team_id === $team->id, 404);

        $refund->delete();

        return back()->with('success', 'Refund berhasil dihapus.');
    }

    private function applyFilters($query, array $filters): void
    {
        $search = trim((string) ($filters['search'] ?? ''));

        if ($search !== '') {
            $query->where(function ($query) use ($search) {
                $query->where('refund_number', 'like', "%{$search}%")
                    ->orWhere('reason', 'like', "%{$search}%")
                    ->orWhereHas('transaction', function ($query) use ($search) {
                        $query->where('invoice_number', 'like', "%{$search}%")
                            ->orWhere('customer_name', 'like', "%{$search}%");
                    });
            });
        }

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (! empty($filters['method'])) {
            $query->where('method', $filters['method']);
        }

        if (! empty($filters['date_from'])) {
            $query->whereDate('created_at', '>=', $filters['date_from']);
        }

        if (! empty($filters['date_to'])) {
            $query->whereDate('created_at', '<=', $filters['date_to']);
        }
    }
}
