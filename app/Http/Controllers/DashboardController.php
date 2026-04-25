<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $team = $user->currentTeam;

        $stats = [];

        if ($team) {
            setPermissionsTeamId($team->id);

            // Only show stats user has permission to see
            if ($user->canOnCurrentTeam('transaction.view')) {
                // TODO: Replace with actual Transaction model queries scoped to team
                $stats['transactions_today'] = 0;
                $stats['revenue_today'] = 0;
                $stats['transactions_month'] = 0;
                $stats['revenue_month'] = 0;
            }

            if ($user->canOnCurrentTeam('product.view')) {
                $stats['total_products'] = 0;
                $stats['low_stock_products'] = 0;
            }

            if ($user->canOnCurrentTeam('user.view')) {
                $stats['total_members'] = $team->members()->count();
            }
        }

        return Inertia::render('Dashboard', [
            'stats' => $stats,
            'isOwner' => $team ? $user->ownsTeam($team) : false,
        ]);
    }
}