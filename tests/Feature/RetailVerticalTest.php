<?php

use App\Actions\Pos\CreatePosTransactionAction;
use App\Actions\PurchaseOrder\CreatePurchaseOrderAction;
use App\Actions\PurchaseOrder\ReceivePurchaseOrderAction;
use App\Models\InventoryBatch;
use App\Models\Product;
use App\Models\ProductUnit;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;

uses(RefreshDatabase::class);

function retailProduct(User $owner, array $overrides = []): Product
{
    return Product::create(array_merge([
        'team_id' => $owner->currentTeam->id,
        'sku' => 'RTL-'.fake()->unique()->numerify('####'),
        'name' => 'Produk Retail',
        'barcode' => fake()->unique()->numerify('899##########'),
        'base_unit' => 'pcs',
        'price' => 5000,
        'cost' => 3000,
        'stock' => 24,
        'min_stock' => 2,
        'is_active' => true,
    ], $overrides));
}

test('product variants and alternative units remain scoped to the active store', function () {
    $owner = User::factory()->create();
    $parent = retailProduct($owner, ['name' => 'Kaos', 'sku' => 'KAOS']);

    $response = $this->actingAs($owner)->post("/{$owner->currentTeam->slug}/products", [
        'parent_product_id' => $parent->id,
        'variant_name' => 'Hitam / XL',
        'sku' => 'KAOS-HITAM-XL',
        'barcode' => '899100000001',
        'base_unit' => 'pcs',
        'name' => 'Kaos',
        'price' => 75000,
        'stock' => 24,
        'min_stock' => 2,
        'is_active' => true,
        'tracks_batches' => false,
        'units' => [[
            'name' => 'Lusin',
            'abbreviation' => 'lsn',
            'conversion_quantity' => 12,
            'barcode' => '899100000002',
            'selling_price' => 850000,
            'is_active' => true,
        ]],
    ]);

    $response->assertRedirect()->assertSessionHasNoErrors();
    $variant = Product::where('sku', 'KAOS-HITAM-XL')->firstOrFail();

    expect($variant->parent_product_id)->toBe($parent->id)
        ->and($variant->variant_name)->toBe('Hitam / XL')
        ->and($variant->units)->toHaveCount(1)
        ->and($variant->units->first()->team_id)->toBe($owner->currentTeam->id);
});

test('pos sale by alternative unit records the unit snapshot and deducts base stock', function () {
    $owner = User::factory()->create();
    $product = retailProduct($owner, ['stock' => 30]);
    $unit = ProductUnit::create([
        'team_id' => $owner->currentTeam->id,
        'product_id' => $product->id,
        'name' => 'Dus',
        'abbreviation' => 'dus',
        'conversion_quantity' => 12,
        'barcode' => '899200000001',
        'selling_price' => 55000,
        'is_active' => true,
    ]);

    $transaction = app(CreatePosTransactionAction::class)->execute($owner->currentTeam, $owner, [
        'items' => [['product_id' => $product->id, 'unit_id' => $unit->id, 'quantity' => 2]],
        'payment_method' => 'cash',
        'paid_amount' => 110000,
    ]);
    $line = $transaction->items->first();

    expect($product->fresh()->stock)->toBe(6)
        ->and($line->product_unit_id)->toBe($unit->id)
        ->and($line->unit_name)->toBe('dus')
        ->and($line->unit_conversion)->toBe(12)
        ->and($line->base_quantity)->toBe(24)
        ->and((float) $line->line_total)->toBe(110000.0);
});

test('tracked batches received from purchase orders are consumed with FEFO', function () {
    $owner = User::factory()->create();
    $product = retailProduct($owner, ['stock' => 0, 'tracks_batches' => true]);
    $supplier = Supplier::create(['team_id' => $owner->currentTeam->id, 'name' => 'Supplier Batch']);
    $order = app(CreatePurchaseOrderAction::class)->execute($owner->currentTeam, $owner, [
        'supplier_id' => $supplier->id,
        'items' => [['product_id' => $product->id, 'quantity' => 10, 'unit_cost' => 3000]],
    ]);
    $item = $order->items->first();

    app(ReceivePurchaseOrderAction::class)->execute($order, $owner, [$item->id => 5], [
        $item->id => ['batch_number' => 'LAMBAT', 'expires_at' => '2027-12-31'],
    ]);
    app(ReceivePurchaseOrderAction::class)->execute($order->fresh(), $owner, [$item->id => 5], [
        $item->id => ['batch_number' => 'CEPAT', 'expires_at' => '2027-01-31'],
    ]);

    app(CreatePosTransactionAction::class)->execute($owner->currentTeam, $owner, [
        'items' => [['product_id' => $product->id, 'quantity' => 6]],
        'payment_method' => 'cash',
        'paid_amount' => 30000,
    ]);

    expect(InventoryBatch::where('batch_number', 'CEPAT')->value('quantity'))->toBe(0)
        ->and(InventoryBatch::where('batch_number', 'LAMBAT')->value('quantity'))->toBe(4)
        ->and($product->fresh()->stock)->toBe(4)
        ->and($product->inventoryBatches()->sum('quantity'))->toBe(4);
});

test('pos barcode search returns the matching sale unit', function () {
    $owner = User::factory()->create();
    $product = retailProduct($owner);
    $unit = ProductUnit::create([
        'team_id' => $owner->currentTeam->id,
        'product_id' => $product->id,
        'name' => 'Dus',
        'abbreviation' => 'dus',
        'conversion_quantity' => 12,
        'barcode' => '899300000001',
        'selling_price' => 55000,
        'is_active' => true,
    ]);

    $this->actingAs($owner)
        ->getJson("/{$owner->currentTeam->slug}/pos/products/search?search={$unit->barcode}")
        ->assertOk()
        ->assertJsonFragment([
            'unit_id' => $unit->id,
            'unit_name' => 'dus',
            'barcode' => '899300000001',
            'stock' => 2,
        ]);
});

test('expired batch stock is not sellable', function () {
    $owner = User::factory()->create();
    $product = retailProduct($owner, ['stock' => 2, 'tracks_batches' => true]);
    InventoryBatch::create([
        'team_id' => $owner->currentTeam->id,
        'product_id' => $product->id,
        'batch_number' => 'EXPIRED',
        'expires_at' => today()->subDay(),
        'quantity' => 2,
    ]);

    expect(fn () => app(CreatePosTransactionAction::class)->execute($owner->currentTeam, $owner, [
        'items' => [['product_id' => $product->id, 'quantity' => 1]],
        'payment_method' => 'cash',
        'paid_amount' => 5000,
    ]))->toThrow(ValidationException::class);

    expect($product->fresh()->stock)->toBe(2);
});
