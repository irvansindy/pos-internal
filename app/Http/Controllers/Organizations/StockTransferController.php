<?php

namespace App\Http\Controllers\Organizations;

use App\Actions\StockTransfer\CancelStockTransferAction;
use App\Actions\StockTransfer\CreateStockTransferAction;
use App\Actions\StockTransfer\ReceiveStockTransferAction;
use App\Actions\StockTransfer\ShipStockTransferAction;
use App\Http\Controllers\Controller;
use App\Models\StockTransfer;
use App\Models\Team;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StockTransferController extends Controller
{
    public function index(Request $request): Response
    {
        $organization = $this->organization($request);
        $teams = $organization->teams()->with(['products' => fn ($query) => $query->where('is_active', true)->orderBy('name')])->orderBy('name')->get();

        return Inertia::render('organizations/stock-transfers', [
            'teams' => $teams,
            'transfers' => $organization->stockTransfers()->with(['fromTeam:id,name,slug', 'toTeam:id,name,slug', 'requester:id,name', 'shipper:id,name', 'receiver:id,name', 'items.fromProduct:id,name,sku', 'items.toProduct:id,name,sku'])->latest()->get(),
            'canManage' => true,
        ]);
    }

    public function store(Request $request, CreateStockTransferAction $action)
    {
        $organization = $this->organization($request);
        $data = $request->validate([
            'from_team_id' => ['required', 'integer'], 'to_team_id' => ['required', 'integer', 'different:from_team_id'],
            'note' => ['nullable', 'string', 'max:1000'], 'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'distinct'], 'items.*.quantity' => ['required', 'integer', 'min:1'],
        ]);
        $from = Team::findOrFail($data['from_team_id']);
        $to = Team::findOrFail($data['to_team_id']);
        $transfer = $action->execute($organization, $from, $to, $request->user(), $data);

        return back()->with('success', "Transfer {$transfer->transfer_number} dibuat.");
    }

    public function ship(Request $request, StockTransfer $stockTransfer, ShipStockTransferAction $action)
    {
        $this->authorizeTransfer($request, $stockTransfer);
        $action->execute($stockTransfer, $request->user());

        return back()->with('success', 'Stok sudah dikurangi dan transfer dalam perjalanan.');
    }

    public function receive(Request $request, StockTransfer $stockTransfer, ReceiveStockTransferAction $action)
    {
        $this->authorizeTransfer($request, $stockTransfer);
        $action->execute($stockTransfer, $request->user());

        return back()->with('success', 'Transfer diterima dan stok tujuan sudah bertambah.');
    }

    public function cancel(Request $request, StockTransfer $stockTransfer, CancelStockTransferAction $action)
    {
        $this->authorizeTransfer($request, $stockTransfer);
        $action->execute($stockTransfer, $request->user());

        return back()->with('success', 'Transfer dibatalkan.');
    }

    private function organization(Request $request)
    {
        $organization = $request->user()->currentOrganization;
        abort_unless($organization && $organization->members()->whereKey($request->user()->id)->exists(), 403);
        abort_unless($organization->currentSubscription()?->isUsable(), 403, 'Langganan organization tidak aktif.');

        return $organization;
    }

    private function authorizeTransfer(Request $request, StockTransfer $transfer): void
    {
        $organization = $this->organization($request);
        abort_unless($transfer->organization_id === $organization->id, 404);
    }
}
