<?php

namespace App\Http\Controllers;

use App\Actions\Voucher\SaveVoucherAction;
use App\Models\Voucher;
use Illuminate\Http\Request;
use Inertia\Inertia;

class VoucherController extends Controller
{
    public function index(Request $request)
    {
        $team = $request->user()?->currentTeam;
        $user = $request->user();

        abort_if(! $team, 403, 'Tidak ada tim aktif.');

        $filters = $request->only(['search', 'type', 'status']);
        $query = $team->vouchers()->latest('created_at');

        $this->applyFilters($query, $filters);

        return Inertia::render('vouchers/index', [
            'vouchers' => $query->paginate(10)->withQueryString(),
            'filters' => array_merge([
                'search' => '',
                'type' => '',
                'status' => '',
            ], $filters),
            'summary' => [
                'total' => $team->vouchers()->count(),
                'active' => $team->vouchers()->where('is_active', true)->count(),
                'used' => $team->vouchers()->sum('used_count'),
                'transactions' => $team->transactions()->whereNotNull('voucher_id')->count(),
            ],
            'teamSlug' => $team->slug,
            'canCreate' => $user->ownsTeam($team) || $user->canOnCurrentTeam('voucher.create'),
            'canUpdate' => $user->ownsTeam($team) || $user->canOnCurrentTeam('voucher.update'),
            'canDelete' => $user->ownsTeam($team) || $user->canOnCurrentTeam('voucher.delete'),
        ]);
    }

    public function store(Request $request, SaveVoucherAction $action)
    {
        $team = $request->user()?->currentTeam;

        abort_if(! $team, 403, 'Tidak ada tim aktif.');

        $action->execute($team, $this->validated($request));

        return back()->with('success', 'Voucher berhasil dibuat.');
    }

    public function update(Request $request, string $currentTeam, Voucher $voucher, SaveVoucherAction $action)
    {
        $team = $request->user()?->currentTeam;

        abort_if(! $team, 403, 'Tidak ada tim aktif.');
        abort_unless($voucher->team_id === $team->id, 404);

        $action->execute($team, $this->validated($request), $voucher);

        return back()->with('success', 'Voucher berhasil diperbarui.');
    }

    public function destroy(Request $request, string $currentTeam, Voucher $voucher)
    {
        $team = $request->user()?->currentTeam;

        abort_if(! $team, 403, 'Tidak ada tim aktif.');
        abort_unless($voucher->team_id === $team->id, 404);

        if ($voucher->transactions()->exists()) {
            return back()->with('error', 'Voucher yang sudah dipakai transaksi tidak dapat dihapus.');
        }

        $voucher->delete();

        return back()->with('success', 'Voucher berhasil dihapus.');
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'code' => ['required', 'string', 'max:50'],
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'string', 'in:fixed,percent'],
            'value' => ['required', 'numeric', 'min:0'],
            'min_purchase' => ['nullable', 'numeric', 'min:0'],
            'max_discount' => ['nullable', 'numeric', 'min:0'],
            'usage_limit' => ['nullable', 'integer', 'min:1'],
            'starts_at' => ['nullable', 'date'],
            'expires_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'is_active' => ['nullable', 'boolean'],
        ]);
    }

    private function applyFilters($query, array $filters): void
    {
        $search = trim((string) ($filters['search'] ?? ''));

        if ($search !== '') {
            $query->where(function ($query) use ($search) {
                $query->where('code', 'like', "%{$search}%")
                    ->orWhere('name', 'like', "%{$search}%");
            });
        }

        if (! empty($filters['type'])) {
            $query->where('type', $filters['type']);
        }

        if (($filters['status'] ?? '') === 'active') {
            $query->where('is_active', true);
        }

        if (($filters['status'] ?? '') === 'inactive') {
            $query->where('is_active', false);
        }
    }
}
