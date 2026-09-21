<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Admin\UpdateSubscriptionStatusAction;
use App\Enums\OrganizationRole;
use App\Enums\SubscriptionStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateSubscriptionStatusRequest;
use App\Models\Organization;
use App\Models\Plan;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PlatformOrganizationController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', Rule::in([
                ...array_map(fn (SubscriptionStatus $status) => $status->value, SubscriptionStatus::cases()),
                'attention',
            ])],
            'plan' => ['nullable', 'string', 'max:100'],
        ]);

        $organizations = Organization::query()
            ->with(['latestSubscription.plan', 'members'])
            ->withCount(['teams', 'members'])
            ->when($filters['search'] ?? null, function ($query, string $search) {
                $query->where(function ($query) use ($search) {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('slug', 'like', "%{$search}%")
                        ->orWhereHas('members', fn ($query) => $query
                            ->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%"));
                });
            })
            ->when($filters['status'] ?? null, fn ($query, string $status) => $query
                ->whereHas('latestSubscription', fn ($query) => $status === 'attention'
                    ? $query->whereIn('status', [SubscriptionStatus::PastDue, SubscriptionStatus::Suspended])
                    : $query->where('status', $status)))
            ->when($filters['plan'] ?? null, fn ($query, string $plan) => $query
                ->whereHas('latestSubscription.plan', fn ($query) => $query->where('code', $plan)))
            ->latest()
            ->paginate(15)
            ->withQueryString()
            ->through(fn (Organization $organization) => [
                'id' => $organization->id,
                'name' => $organization->name,
                'slug' => $organization->slug,
                'stores_count' => $organization->teams_count,
                'members_count' => $organization->members_count,
                'owner' => $organization->members->firstWhere('pivot.role', OrganizationRole::Owner->value)?->only(['name', 'email']),
                'plan' => $organization->latestSubscription?->plan?->only(['code', 'name']),
                'subscription_status' => $organization->latestSubscription?->status?->value,
                'period_end' => $organization->latestSubscription?->current_period_end?->toISOString(),
                'created_at' => $organization->created_at->toISOString(),
            ]);

        return Inertia::render('admin/organizations/index', [
            'organizations' => $organizations,
            'filters' => [
                'search' => $filters['search'] ?? '',
                'status' => $filters['status'] ?? '',
                'plan' => $filters['plan'] ?? '',
            ],
            'plans' => Plan::query()->orderBy('sort_order')->get(['code', 'name']),
            'statuses' => collect([
                ['value' => 'attention', 'label' => 'Perlu ditindak'],
                ...collect(SubscriptionStatus::cases())->map(fn ($status) => [
                    'value' => $status->value,
                    'label' => $status->label(),
                ])->all(),
            ]),
        ]);
    }

    public function show(Organization $organization): Response
    {
        $organization->load([
            'latestSubscription.plan',
            'latestSubscription.pendingPlan',
            'members',
            'teams:id,organization_id,name,slug,created_at',
            'subscriptionInvoices' => fn ($query) => $query->with('plan:id,name')->latest()->limit(10),
            'platformAdminAudits' => fn ($query) => $query->with('actor:id,name,email')->latest()->limit(15),
        ]);

        $subscription = $organization->latestSubscription;

        return Inertia::render('admin/organizations/show', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
                'slug' => $organization->slug,
                'created_at' => $organization->created_at->toISOString(),
                'members' => $organization->members->map(fn ($member) => [
                    'id' => $member->id,
                    'name' => $member->name,
                    'email' => $member->email,
                    'role' => $member->pivot->role,
                ]),
                'teams' => $organization->teams,
                'subscription' => $subscription ? [
                    'id' => $subscription->id,
                    'status' => $subscription->status->value,
                    'status_label' => $subscription->status->label(),
                    'plan' => $subscription->plan,
                    'pending_plan' => $subscription->pendingPlan,
                    'effective_max_stores' => $subscription->effectiveMaxStores(),
                    'effective_max_owners' => $subscription->effectiveMaxOwners(),
                    'trial_ends_at' => $subscription->trial_ends_at?->toISOString(),
                    'current_period_start' => $subscription->current_period_start?->toISOString(),
                    'current_period_end' => $subscription->current_period_end?->toISOString(),
                ] : null,
                'invoices' => $organization->subscriptionInvoices,
                'audits' => $organization->platformAdminAudits,
            ],
            'statusOptions' => collect([
                SubscriptionStatus::Active,
                SubscriptionStatus::Suspended,
                SubscriptionStatus::Canceled,
            ])->map(fn ($status) => ['value' => $status->value, 'label' => $status->label()]),
        ]);
    }

    public function updateSubscriptionStatus(
        UpdateSubscriptionStatusRequest $request,
        Organization $organization,
        UpdateSubscriptionStatusAction $action,
    ) {
        $action->execute(
            $organization,
            $request->user(),
            SubscriptionStatus::from($request->validated('status')),
            $request->validated('reason'),
        );

        return back()->with('success', 'Status subscription berhasil diperbarui.');
    }
}
