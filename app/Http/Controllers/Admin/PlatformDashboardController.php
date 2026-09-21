<?php

namespace App\Http\Controllers\Admin;

use App\Enums\CustomPlanRequestStatus;
use App\Enums\InvoiceStatus;
use App\Enums\SubscriptionStatus;
use App\Http\Controllers\Controller;
use App\Models\CustomPlanRequest;
use App\Models\Organization;
use App\Models\Subscription;
use App\Models\SubscriptionInvoice;
use App\Models\Team;
use Inertia\Inertia;
use Inertia\Response;

class PlatformDashboardController extends Controller
{
    public function __invoke(): Response
    {
        $currentSubscriptionIds = Subscription::query()
            ->selectRaw('MAX(id)')
            ->groupBy('organization_id');
        $statusCounts = Subscription::query()
            ->whereIn('id', $currentSubscriptionIds)
            ->selectRaw('status, COUNT(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        $recentOrganizations = Organization::query()
            ->with(['latestSubscription.plan', 'members'])
            ->withCount('teams')
            ->latest()
            ->limit(6)
            ->get()
            ->map(fn (Organization $organization) => [
                'id' => $organization->id,
                'name' => $organization->name,
                'slug' => $organization->slug,
                'stores_count' => $organization->teams_count,
                'owners_count' => $organization->members->where('pivot.role', 'owner')->count(),
                'plan' => $organization->latestSubscription?->plan?->name,
                'subscription_status' => $organization->latestSubscription?->status?->value,
                'created_at' => $organization->created_at->toISOString(),
            ]);

        return Inertia::render('admin/dashboard', [
            'metrics' => [
                'organizations' => Organization::count(),
                'stores' => Team::count(),
                'active_subscriptions' => (int) ($statusCounts[SubscriptionStatus::Active->value] ?? 0),
                'attention_subscriptions' => (int) ($statusCounts[SubscriptionStatus::PastDue->value] ?? 0)
                    + (int) ($statusCounts[SubscriptionStatus::Suspended->value] ?? 0),
                'paid_revenue_this_month' => (float) SubscriptionInvoice::query()
                    ->where('status', InvoiceStatus::Paid)
                    ->whereMonth('paid_at', now()->month)
                    ->whereYear('paid_at', now()->year)
                    ->sum('amount'),
                'pending_invoices' => SubscriptionInvoice::where('status', InvoiceStatus::Pending)->count(),
                'pending_custom_requests' => CustomPlanRequest::where('status', CustomPlanRequestStatus::Pending)->count(),
            ],
            'subscriptionStatusCounts' => collect(SubscriptionStatus::cases())->mapWithKeys(
                fn (SubscriptionStatus $status) => [$status->value => (int) ($statusCounts[$status->value] ?? 0)]
            ),
            'recentOrganizations' => $recentOrganizations,
        ]);
    }
}
