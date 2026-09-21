<?php

namespace App\Http\Controllers;

use App\Actions\CashierShift\CloseCashierShiftAction;
use App\Actions\CashierShift\OpenCashierShiftAction;
use App\Actions\CashierShift\RecordCashMovementAction;
use App\Http\Requests\CashierShift\CloseCashierShiftRequest;
use App\Http\Requests\CashierShift\OpenCashierShiftRequest;
use App\Http\Requests\CashierShift\RecordCashMovementRequest;
use App\Models\CashierShift;
use App\Support\CashierShiftReconciliation;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CashierShiftController extends Controller
{
    public function __construct(private CashierShiftReconciliation $reconciliation) {}

    public function index(Request $request): Response
    {
        $team = $request->user()->currentTeam;
        $user = $request->user();
        $canViewAll = $user->ownsTeam($team) || $user->canOnCurrentTeam('cashier-shift.view-all');
        $activeShift = CashierShift::query()
            ->where('team_id', $team->id)
            ->where('user_id', $user->id)
            ->where('status', CashierShift::STATUS_OPEN)
            ->with(['user:id,name', 'movements' => fn ($query) => $query->latest('occurred_at')])
            ->first();

        $history = CashierShift::query()
            ->where('team_id', $team->id)
            ->when(! $canViewAll, fn ($query) => $query->where('user_id', $user->id))
            ->with('user:id,name')
            ->latest('opened_at')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('cashier-operations/index', [
            'teamSlug' => $team->slug,
            'activeShift' => $activeShift ? [
                ...$activeShift->toArray(),
                'live_summary' => $this->reconciliation->calculate($activeShift),
            ] : null,
            'history' => $history,
            'canViewAll' => $canViewAll,
        ]);
    }

    public function open(OpenCashierShiftRequest $request, OpenCashierShiftAction $action)
    {
        $action->execute($request->user()->currentTeam, $request->user(), $request->validated());

        return back()->with('success', 'Shift kasir berhasil dibuka.');
    }

    public function movement(
        RecordCashMovementRequest $request,
        string $currentTeam,
        CashierShift $cashierShift,
        RecordCashMovementAction $action,
    ) {
        $action->execute(
            $request->user()->currentTeam,
            $request->user(),
            $cashierShift,
            $request->validated(),
        );

        return back()->with('success', 'Pergerakan kas berhasil dicatat.');
    }

    public function close(
        CloseCashierShiftRequest $request,
        string $currentTeam,
        CashierShift $cashierShift,
        CloseCashierShiftAction $action,
    ) {
        $closed = $action->execute(
            $request->user()->currentTeam,
            $request->user(),
            $cashierShift,
            $request->validated(),
        );

        $difference = (float) $closed->difference_amount;
        $message = match (true) {
            $difference > 0 => 'Shift ditutup dengan kas lebih Rp'.number_format($difference, 0, ',', '.'),
            $difference < 0 => 'Shift ditutup dengan kas kurang Rp'.number_format(abs($difference), 0, ',', '.'),
            default => 'Shift ditutup dan kas sesuai.',
        };

        return back()->with($difference === 0.0 ? 'success' : 'warning', $message);
    }
}
