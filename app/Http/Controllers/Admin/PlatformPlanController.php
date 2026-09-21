<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Admin\UpdatePlanAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdatePlanRequest;
use App\Models\Plan;
use Inertia\Inertia;
use Inertia\Response;

class PlatformPlanController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/plans/index', [
            'plans' => Plan::query()
                ->withCount([
                    'subscriptions as current_subscriptions_count' => fn ($query) => $query
                        ->whereIn('id', function ($query) {
                            $query->selectRaw('MAX(id)')->from('subscriptions')->groupBy('organization_id');
                        }),
                ])
                ->orderBy('sort_order')
                ->get(),
        ]);
    }

    public function update(UpdatePlanRequest $request, Plan $plan, UpdatePlanAction $action)
    {
        $action->execute($plan, $request->user(), $request->validated());

        return back()->with('success', "Paket {$plan->name} berhasil diperbarui.");
    }
}
