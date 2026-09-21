<?php

use App\Actions\Pos\CreatePosTransactionAction;
use App\Actions\Pos\ProcessTransactionPaymentAction;
use App\Actions\PurchaseOrder\CreatePurchaseOrderAction;
use App\Actions\PurchaseOrder\ReceivePurchaseOrderAction;
use App\Actions\StockOpname\CreateStockOpnameAction;
use App\Actions\StockTransfer\CreateStockTransferAction;
use App\Actions\StockTransfer\ReceiveStockTransferAction;
use App\Actions\StockTransfer\ShipStockTransferAction;
use App\Mail\TransactionReceiptMail;
use App\Models\Customer;
use App\Models\DiningTable;
use App\Models\Product;
use App\Models\ProductStockMovement;
use App\Models\StockTransfer;
use App\Models\Supplier;
use App\Models\Team;
use App\Models\Transaction;
use App\Models\User;
use Database\Seeders\MenuSeeder;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function roadmapProduct(Team $team, array $overrides = []): Product
{
    return Product::create(array_merge([
        'team_id' => $team->id,
        'sku' => 'ROAD-'.fake()->unique()->numerify('####'),
        'name' => 'Produk Roadmap',
        'price' => 20000,
        'cost' => 10000,
        'stock' => 20,
        'min_stock' => 2,
        'is_active' => true,
    ], $overrides));
}

test('organization dashboard consolidates only stores in the active organization', function () {
    $owner = User::factory()->create();
    $organization = $owner->currentOrganization;
    $secondStore = Team::factory()->create(['organization_id' => $organization->id, 'name' => 'Cabang Dua']);

    Transaction::create([
        'team_id' => $owner->currentTeam->id, 'user_id' => $owner->id, 'invoice_number' => 'POS-DASH-1',
        'status' => 'completed', 'payment_status' => 'paid', 'subtotal' => 10000, 'grand_total' => 10000, 'paid_amount' => 10000,
    ]);
    Transaction::create([
        'team_id' => $secondStore->id, 'user_id' => $owner->id, 'invoice_number' => 'POS-DASH-2',
        'status' => 'completed', 'payment_status' => 'paid', 'subtotal' => 25000, 'grand_total' => 25000, 'paid_amount' => 25000,
    ]);

    $this->actingAs($owner)->get(route('organizations.dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('organizations/dashboard')->where('summary.today', 35000)->has('stores', 2));
});

test('stock transfer moves stock with movements and creates matching destination SKU', function () {
    $owner = User::factory()->create();
    $organization = $owner->currentOrganization;
    $sourceTeam = $owner->currentTeam;
    $destinationTeam = Team::factory()->create(['organization_id' => $organization->id]);
    $source = roadmapProduct($sourceTeam, ['sku' => 'SHARED-SKU', 'stock' => 10]);

    $transfer = app(CreateStockTransferAction::class)->execute($organization, $sourceTeam, $destinationTeam, $owner, [
        'items' => [['product_id' => $source->id, 'quantity' => 4]],
    ]);
    app(ShipStockTransferAction::class)->execute($transfer, $owner);

    expect($source->fresh()->stock)->toBe(6)
        ->and($transfer->fresh()->status)->toBe(StockTransfer::STATUS_IN_TRANSIT);

    app(ReceiveStockTransferAction::class)->execute($transfer->fresh(), $owner);
    $destination = Product::where('team_id', $destinationTeam->id)->where('sku', 'SHARED-SKU')->firstOrFail();

    expect($destination->stock)->toBe(4)
        ->and($transfer->fresh()->status)->toBe(StockTransfer::STATUS_RECEIVED)
        ->and(ProductStockMovement::where('reference_type', StockTransfer::class)->where('reference_id', $transfer->id)->count())->toBe(2);
});

test('purchase order supports partial receipt and updates stock cost on full receipt', function () {
    $owner = User::factory()->create();
    $team = $owner->currentTeam;
    $product = roadmapProduct($team, ['stock' => 0, 'cost' => 5000]);
    $supplier = Supplier::create(['team_id' => $team->id, 'name' => 'Supplier A']);
    $order = app(CreatePurchaseOrderAction::class)->execute($team, $owner, [
        'supplier_id' => $supplier->id,
        'items' => [['product_id' => $product->id, 'quantity' => 5, 'unit_cost' => 7500]],
    ]);
    $item = $order->items->first();

    app(ReceivePurchaseOrderAction::class)->execute($order, $owner, [$item->id => 2]);
    expect($product->fresh()->stock)->toBe(2)->and($order->fresh()->status)->toBe('partial');

    app(ReceivePurchaseOrderAction::class)->execute($order->fresh(), $owner, [$item->id => 3]);
    expect($product->fresh()->stock)->toBe(5)
        ->and((float) $product->fresh()->cost)->toBe(7500.0)
        ->and($order->fresh()->status)->toBe('received');
});

test('stock opname records difference and adjusts stock through a movement', function () {
    $owner = User::factory()->create();
    $product = roadmapProduct($owner->currentTeam, ['stock' => 10]);
    $opname = app(CreateStockOpnameAction::class)->execute($owner->currentTeam, $owner, [
        'items' => [['product_id' => $product->id, 'physical_qty' => 7, 'note' => 'Rusak']],
    ]);

    expect($product->fresh()->stock)->toBe(7)
        ->and($opname->items->first()->difference)->toBe(-3)
        ->and(ProductStockMovement::where('reference_type', $opname::class)->where('reference_id', $opname->id)->exists())->toBeTrue();
});

test('customer can redeem and earn points in one fully paid transaction', function () {
    config(['loyalty.spend_per_point' => 10000, 'loyalty.point_value' => 100]);
    $owner = User::factory()->create();
    $product = roadmapProduct($owner->currentTeam);
    $customer = Customer::create(['team_id' => $owner->currentTeam->id, 'name' => 'Budi', 'phone' => '08123', 'points_balance' => 100]);

    $transaction = app(CreatePosTransactionAction::class)->execute($owner->currentTeam, $owner, [
        'customer_id' => $customer->id, 'points_to_redeem' => 10,
        'items' => [['product_id' => $product->id, 'quantity' => 1]],
        'payment_method' => 'cash', 'paid_amount' => 19000,
    ]);

    expect((float) $transaction->grand_total)->toBe(19000.0)
        ->and($transaction->points_redeemed)->toBe(10)
        ->and($customer->fresh()->points_balance)->toBe(91)
        ->and($customer->pointTransactions()->count())->toBe(2);
});

test('unpaid table order occupies table and settlement releases it', function () {
    $owner = User::factory()->create();
    $product = roadmapProduct($owner->currentTeam);
    $table = DiningTable::create(['team_id' => $owner->currentTeam->id, 'name' => 'Meja 1', 'capacity' => 4]);

    $transaction = app(CreatePosTransactionAction::class)->execute($owner->currentTeam, $owner, [
        'dining_table_id' => $table->id,
        'items' => [['product_id' => $product->id, 'quantity' => 1]],
        'payment_method' => 'cash', 'paid_amount' => 0,
    ]);
    expect($transaction->status)->toBe(Transaction::STATUS_PENDING)->and($table->fresh()->status)->toBe(DiningTable::STATUS_OCCUPIED);

    app(ProcessTransactionPaymentAction::class)->execute($owner->currentTeam, $transaction, ['payment_method' => 'cash', 'paid_amount' => 20000]);
    expect($table->fresh()->status)->toBe(DiningTable::STATUS_AVAILABLE);
});

test('receipt can be downloaded and sent by email or Fonnte', function () {
    Mail::fake();
    Http::fake(['api.fonnte.com/*' => Http::response(['status' => true])]);
    config(['fonnte.token' => 'test-token']);
    $owner = User::factory()->create();
    $product = roadmapProduct($owner->currentTeam);
    $transaction = app(CreatePosTransactionAction::class)->execute($owner->currentTeam, $owner, [
        'items' => [['product_id' => $product->id, 'quantity' => 1]], 'payment_method' => 'cash', 'paid_amount' => 20000,
    ]);
    $base = "/{$owner->currentTeam->slug}/pos/transaction/{$transaction->id}/receipt";

    $this->actingAs($owner)->get($base)->assertOk()->assertHeader('content-type', 'application/pdf');
    $this->actingAs($owner)->post("{$base}/email", ['email' => 'buyer@example.com'])->assertRedirect();
    Mail::assertSent(TransactionReceiptMail::class, fn ($mail) => $mail->hasTo('buyer@example.com'));

    $this->actingAs($owner)->post("{$base}/whatsapp", ['phone' => '08123456789'])->assertRedirect();
    Http::assertSent(fn ($request) => $request->url() === 'https://api.fonnte.com/send' && $request->hasHeader('Authorization', 'test-token'));
});

test('roadmap menu routes resolve to their team-scoped pages', function () {
    $this->seed([PermissionSeeder::class, MenuSeeder::class]);

    $owner = User::factory()->create();
    $teamSlug = $owner->currentTeam->slug;

    $this->actingAs($owner)
        ->get(route('inventory-operations.index', ['current_team' => $teamSlug]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('inventory/operations')
            ->where('navigation.2.children.5.href', "/{$teamSlug}/inventory-operations"));

    $this->actingAs($owner)
        ->get(route('customers.index', ['current_team' => $teamSlug]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('customers/index'));

    $this->actingAs($owner)
        ->get(route('dining-tables.index', ['current_team' => $teamSlug]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('dining-tables/index'));
});
