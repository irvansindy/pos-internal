<?php

namespace App\Http\Controllers;

use App\Models\DiningTable;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class DiningTableController extends Controller
{
    public function index(Request $request): Response
    {
        $team = $request->user()->currentTeam;

        return Inertia::render('dining-tables/index', [
            'teamSlug' => $team->slug,
            'tables' => $team->diningTables()->with(['transactions' => fn ($query) => $query->where('status', '!=', 'void')->where('payment_status', '!=', 'paid')->latest()->limit(1)])->orderBy('name')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $team = $request->user()->currentTeam;
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100', Rule::unique('dining_tables')->where('team_id', $team->id)],
            'capacity' => ['required', 'integer', 'min:1', 'max:100'],
            'status' => ['nullable', Rule::in([DiningTable::STATUS_AVAILABLE, DiningTable::STATUS_RESERVED])],
        ]);
        $team->diningTables()->create($data);

        return back()->with('success', 'Meja ditambahkan.');
    }

    public function update(Request $request, string $current_team, DiningTable $diningTable)
    {
        $team = $request->user()->currentTeam;
        abort_unless($diningTable->team_id === $team->id, 404);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100', Rule::unique('dining_tables')->where('team_id', $team->id)->ignore($diningTable->id)],
            'capacity' => ['required', 'integer', 'min:1', 'max:100'],
            'status' => ['required', Rule::in([DiningTable::STATUS_AVAILABLE, DiningTable::STATUS_OCCUPIED, DiningTable::STATUS_RESERVED])],
        ]);
        $diningTable->update($data);

        return back()->with('success', 'Meja diperbarui.');
    }

    public function destroy(Request $request, string $current_team, DiningTable $diningTable)
    {
        abort_unless($diningTable->team_id === $request->user()->currentTeam->id, 404);
        abort_if($diningTable->status === DiningTable::STATUS_OCCUPIED, 422, 'Meja yang sedang terisi tidak dapat dihapus.');
        $diningTable->delete();

        return back()->with('success', 'Meja dihapus.');
    }
}
