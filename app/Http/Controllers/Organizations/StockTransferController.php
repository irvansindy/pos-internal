<?php

namespace App\Http\Controllers\Organizations;

use App\Actions\StockTransfer\CancelStockTransferAction;
use App\Actions\StockTransfer\CreateStockTransferAction;
use App\Actions\StockTransfer\ReceiveStockTransferAction;
use App\Actions\StockTransfer\ShipStockTransferAction;
use App\Http\Controllers\Controller;
use App\Models\StockTransfer;
use App\Models\Team;
use App\Models\Warehouse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StockTransferController extends Controller
{
    public function index(Request $request): Response
    {
        $organization = $this->organization($request);
        foreach ($organization->teams()->get(['id']) as $team) {
            $warehouse = Warehouse::query()->firstOrCreate(
                ['team_id' => $team->id, 'code' => 'UTAMA'],
                ['name' => 'Gudang Utama', 'is_default' => true, 'is_active' => true],
            );
            $warehouse->bins()->firstOrCreate(
                ['code' => 'DEFAULT'],
                ['name' => 'Penyimpanan Utama', 'is_default' => true, 'is_active' => true],
            );
        }
        $teams = $organization->teams()
            ->with([
                'products' => fn ($query) => $query
                    ->with([
                        'inventoryBatches' => fn ($batch) => $batch->with(['locationBalances' => fn ($balance) => $balance->with('bin:id,name,code')->where('quantity', '>', 0)])->where('quantity', '>', 0)->orderBy('expires_at'),
                        'inventorySerials' => fn ($serial) => $serial->where('status', 'in_stock')->orderBy('serial_number'),
                    ])
                    ->where('is_active', true)
                    ->orderBy('name'),
                'warehouses.bins',
            ])
            ->orderBy('name')
            ->get();

        return Inertia::render('organizations/stock-transfers', [
            'teams' => $teams,
            'transfers' => $organization->stockTransfers()->with(['fromTeam:id,name,slug', 'toTeam:id,name,slug', 'requester:id,name', 'shipper:id,name', 'receiver:id,name', 'items.fromProduct:id,name,sku', 'items.toProduct:id,name,sku', 'items.batchAllocations.sourceBatch:id,batch_number,expires_at', 'items.serials'])->latest()->get(),
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
            'items.*.batches' => ['nullable', 'array'],
            'items.*.batches.*.inventory_batch_id' => ['required', 'integer'],
            'items.*.batches.*.warehouse_bin_id' => ['nullable', 'integer'],
            'items.*.batches.*.to_warehouse_bin_id' => ['nullable', 'integer'],
            'items.*.batches.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.inventory_serial_ids' => ['nullable', 'array'],
            'items.*.inventory_serial_ids.*' => ['integer'],
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
