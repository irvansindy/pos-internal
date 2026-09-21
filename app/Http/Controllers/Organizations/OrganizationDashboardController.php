<?php

namespace App\Http\Controllers\Organizations;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class OrganizationDashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $organization = $request->user()->currentOrganization;
        abort_unless($organization && $organization->members()->whereKey($request->user()->id)->exists(), 403);

        $teamIds = $organization->teams()->pluck('id');
        $base = Transaction::query()->whereIn('team_id', $teamIds)->where('status', Transaction::STATUS_COMPLETED);
        $startOfToday = now()->startOfDay();

        $summary = [
            'today' => (float) (clone $base)->where('created_at', '>=', $startOfToday)->sum('grand_total'),
            'week' => (float) (clone $base)->where('created_at', '>=', now()->startOfWeek())->sum('grand_total'),
            'month' => (float) (clone $base)->where('created_at', '>=', now()->startOfMonth())->sum('grand_total'),
            'transactions_today' => (clone $base)->where('created_at', '>=', $startOfToday)->count(),
        ];

        $stores = $organization->teams()
            ->leftJoin('transactions', function ($join) {
                $join->on('teams.id', '=', 'transactions.team_id')
                    ->where('transactions.status', '=', Transaction::STATUS_COMPLETED)
                    ->where('transactions.created_at', '>=', now()->startOfMonth());
            })
            ->select('teams.id', 'teams.name', 'teams.slug', DB::raw('COUNT(transactions.id) as transaction_count'), DB::raw('COALESCE(SUM(transactions.grand_total), 0) as revenue'))
            ->groupBy('teams.id', 'teams.name', 'teams.slug')
            ->orderByDesc('revenue')
            ->get();

        $trendRows = (clone $base)
            ->where('created_at', '>=', now()->subDays(29)->startOfDay())
            ->selectRaw('DATE(created_at) as date, SUM(grand_total) as revenue, COUNT(*) as transactions')
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->keyBy('date');

        $trend = collect(range(29, 0))->map(function (int $daysAgo) use ($trendRows) {
            $date = Carbon::today()->subDays($daysAgo)->toDateString();
            $row = $trendRows->get($date);

            return ['date' => $date, 'revenue' => (float) ($row->revenue ?? 0), 'transactions' => (int) ($row->transactions ?? 0)];
        });

        return Inertia::render('organizations/dashboard', [
            'organization' => $organization->only(['id', 'name', 'slug']),
            'summary' => $summary,
            'stores' => $stores,
            'trend' => $trend,
        ]);
    }
}
