<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CustomerController extends Controller
{
    public function index(Request $request): Response
    {
        $team = $request->user()->currentTeam;

        return Inertia::render('customers/index', [
            'teamSlug' => $team->slug,
            'customers' => $team->customers()->withCount('transactions')->latest()->paginate(50)->withQueryString(),
            'loyalty' => ['spendPerPoint' => config('loyalty.spend_per_point'), 'pointValue' => config('loyalty.point_value')],
        ]);
    }

    public function search(Request $request): JsonResponse
    {
        $team = $request->user()->currentTeam;
        $search = trim((string) $request->query('search', ''));
        $customers = $team->customers()
            ->when($search !== '', fn ($query) => $query->where(fn ($query) => $query->where('name', 'like', "%{$search}%")->orWhere('phone', 'like', "%{$search}%")))
            ->orderBy('name')->limit(20)->get(['id', 'name', 'phone', 'email', 'points_balance']);

        return response()->json(['customers' => $customers]);
    }

    public function store(Request $request)
    {
        $team = $request->user()->currentTeam;
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:32', Rule::unique('customers')->where('team_id', $team->id)],
            'email' => ['nullable', 'email', 'max:255'],
        ]);
        $customer = $team->customers()->create($data);

        if ($request->expectsJson()) {
            return response()->json(['customer' => $customer], 201);
        }

        return back()->with('success', 'Pelanggan ditambahkan.');
    }

    public function update(Request $request, string $current_team, Customer $customer)
    {
        $team = $request->user()->currentTeam;
        abort_unless($customer->team_id === $team->id, 404);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:32', Rule::unique('customers')->where('team_id', $team->id)->ignore($customer->id)],
            'email' => ['nullable', 'email', 'max:255'],
        ]);
        $customer->update($data);

        return back()->with('success', 'Data pelanggan diperbarui.');
    }
}
