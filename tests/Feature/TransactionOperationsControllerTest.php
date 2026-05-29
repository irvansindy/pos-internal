<?php

use App\Models\Product;
use App\Models\Transaction;
use App\Models\TransactionItem;
use App\Models\User;
use App\Models\Voucher;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('owner can view and create transaction refunds', function () {
    $owner = User::factory()->create();
    $team = $owner->currentTeam;

    $transaction = Transaction::create([
        'team_id' => $team->id,
        'user_id' => $owner->id,
        'invoice_number' => 'POS-'.now()->format('Ymd').'-0001',
        'customer_name' => 'Pelanggan refund',
        'status' => Transaction::STATUS_COMPLETED,
        'payment_status' => Transaction::PAYMENT_STATUS_PAID,
        'payment_method' => 'cash',
        'subtotal' => 100000,
        'discount_total' => 0,
        'tax_total' => 0,
        'grand_total' => 100000,
        'paid_amount' => 100000,
        'change_amount' => 0,
        'paid_at' => now(),
    ]);

    $this->actingAs($owner)
        ->get("/{$team->slug}/transactions/refunds")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('teamSlug', $team->slug)
            ->where('canManage', true)
        );

    $this->actingAs($owner)
        ->post("/{$team->slug}/transactions/refunds", [
            'transaction_id' => $transaction->id,
            'amount' => 25000,
            'method' => 'cash',
            'status' => 'approved',
            'reason' => 'Barang batal',
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('transaction_refunds', [
        'team_id' => $team->id,
        'transaction_id' => $transaction->id,
        'amount' => 25000,
        'status' => 'approved',
    ]);
});

test('owner can create product return and restock product', function () {
    $owner = User::factory()->create();
    $team = $owner->currentTeam;

    $product = Product::create([
        'team_id' => $team->id,
        'sku' => 'SKU-RETURN-1',
        'name' => 'Produk Return',
        'price' => 30000,
        'cost' => 15000,
        'stock' => 5,
        'min_stock' => 0,
        'is_active' => true,
    ]);

    $transaction = Transaction::create([
        'team_id' => $team->id,
        'user_id' => $owner->id,
        'invoice_number' => 'POS-'.now()->format('Ymd').'-0002',
        'customer_name' => 'Pelanggan return',
        'status' => Transaction::STATUS_COMPLETED,
        'payment_status' => Transaction::PAYMENT_STATUS_PAID,
        'payment_method' => 'cash',
        'subtotal' => 60000,
        'discount_total' => 0,
        'tax_total' => 0,
        'grand_total' => 60000,
        'paid_amount' => 60000,
        'change_amount' => 0,
        'paid_at' => now(),
    ]);

    $item = TransactionItem::create([
        'transaction_id' => $transaction->id,
        'product_id' => $product->id,
        'product_name' => $product->name,
        'product_sku' => $product->sku,
        'unit_price' => 30000,
        'quantity' => 2,
        'discount_total' => 0,
        'line_total' => 60000,
    ]);

    $this->actingAs($owner)
        ->get("/{$team->slug}/transactions/returns")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('teamSlug', $team->slug)
            ->where('canManage', true)
        );

    $this->actingAs($owner)
        ->post("/{$team->slug}/transactions/returns", [
            'transaction_item_id' => $item->id,
            'quantity' => 1,
            'refund_amount' => 30000,
            'restock' => true,
            'status' => 'approved',
            'reason' => 'Barang rusak',
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('transaction_returns', [
        'team_id' => $team->id,
        'transaction_item_id' => $item->id,
        'quantity' => 1,
        'refund_amount' => 30000,
    ]);

    $this->assertDatabaseHas('products', [
        'id' => $product->id,
        'stock' => 6,
    ]);
});

test('owner can manage vouchers used by pos transactions', function () {
    $owner = User::factory()->create();
    $team = $owner->currentTeam;

    $this->actingAs($owner)
        ->get("/{$team->slug}/vouchers")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('teamSlug', $team->slug)
            ->where('canCreate', true)
        );

    $this->actingAs($owner)
        ->post("/{$team->slug}/vouchers", [
            'code' => 'hemat10',
            'name' => 'Hemat sepuluh persen',
            'type' => 'percent',
            'value' => 10,
            'min_purchase' => 50000,
            'max_discount' => 20000,
            'usage_limit' => 5,
            'is_active' => true,
        ])
        ->assertRedirect();

    $voucher = Voucher::where('team_id', $team->id)->where('code', 'HEMAT10')->firstOrFail();

    $this->actingAs($owner)
        ->put("/{$team->slug}/vouchers/{$voucher->id}", [
            'code' => 'HEMAT20',
            'name' => 'Hemat dua puluh persen',
            'type' => 'percent',
            'value' => 20,
            'min_purchase' => 50000,
            'max_discount' => 25000,
            'usage_limit' => 10,
            'is_active' => true,
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('vouchers', [
        'id' => $voucher->id,
        'code' => 'HEMAT20',
        'value' => 20,
    ]);
});
