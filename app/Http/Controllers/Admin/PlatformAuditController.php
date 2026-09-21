<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\PlatformAdminAudit;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PlatformAuditController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'action' => ['nullable', 'string', 'max:100'],
            'organization' => ['nullable', 'integer'],
        ]);

        $audits = PlatformAdminAudit::query()
            ->with(['actor:id,name,email', 'organization:id,name,slug'])
            ->when($filters['search'] ?? null, fn ($query, string $search) => $query
                ->where(function ($query) use ($search) {
                    $query->where('reason', 'like', "%{$search}%")
                        ->orWhereHas('actor', fn ($query) => $query
                            ->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%"))
                        ->orWhereHas('organization', fn ($query) => $query->where('name', 'like', "%{$search}%"));
                }))
            ->when($filters['action'] ?? null, fn ($query, string $action) => $query->where('action', $action))
            ->when($filters['organization'] ?? null, fn ($query, int $organization) => $query->where('organization_id', $organization))
            ->latest()
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('admin/audits/index', [
            'audits' => $audits,
            'filters' => [
                'search' => $filters['search'] ?? '',
                'action' => $filters['action'] ?? '',
                'organization' => $filters['organization'] ?? '',
            ],
            'actions' => PlatformAdminAudit::query()->distinct()->orderBy('action')->pluck('action'),
            'organizations' => Organization::query()->orderBy('name')->get(['id', 'name']),
        ]);
    }
}
