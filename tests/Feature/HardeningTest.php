<?php

use App\Actions\Pos\CreatePosTransactionAction;
use App\Actions\Pos\VoidTransactionAction;
use App\Actions\Transaction\CreateTransactionRefundAction;
use App\Actions\Transaction\CreateTransactionReturnAction;
use App\Enums\TeamRole;
use App\Models\Product;
use App\Models\Transaction;
use App\Models\TransactionReturn;
use App\Models\User;
use App\Models\Voucher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

function hardeningProduct(User $owner, array $overrides = []): Product
{
    return Product::create(array_merge([
        'team_id' => $owner->currentTeam->id,
        'name' => 'Produk Hardening',
        'sku' => 'HARD-'.fake()->unique()->numerify('####'),
        'price' => 20000,
        'cost' => 10000,
        'stock' => 10,
        'min_stock' => 0,
        'is_active' => true,
    ], $overrides));
}

test('refund is capped by collected money and accounts for approved returns', function () {
    $owner = User::factory()->create();
    $product = hardeningProduct($owner);
    $transaction = app(CreatePosTransactionAction::class)->execute($owner->currentTeam, $owner, [
        'items' => [['item_type' => 'product', 'product_id' => $product->id, 'quantity' => 1]],
        'payment_method' => 'cash',
        'paid_amount' => 5000,
    ]);

    expect(fn () => app(CreateTransactionRefundAction::class)->execute($owner->currentTeam, $owner, [
        'transaction_id' => $transaction->id,
        'amount' => 5001,
        'method' => 'cash',
        'status' => 'approved',
    ]))->toThrow(ValidationException::class);

    $refund = app(CreateTransactionRefundAction::class)->execute($owner->currentTeam, $owner, [
        'transaction_id' => $transaction->id,
        'amount' => 3000,
        'method' => 'cash',
        'status' => 'approved',
    ]);

    $item = $transaction->items()->firstOrFail();

    expect(fn () => app(CreateTransactionReturnAction::class)->execute($owner->currentTeam, $owner, [
        'transaction_item_id' => $item->id,
        'quantity' => 1,
        'refund_amount' => 2001,
        'status' => TransactionReturn::STATUS_APPROVED,
    ]))->toThrow(ValidationException::class);

    app(CreateTransactionReturnAction::class)->execute($owner->currentTeam, $owner, [
        'transaction_item_id' => $item->id,
        'quantity' => 1,
        'refund_amount' => 2000,
        'status' => TransactionReturn::STATUS_APPROVED,
    ]);

    expect(fn () => app(CreateTransactionRefundAction::class)->execute($owner->currentTeam, $owner, [
        'transaction_id' => $transaction->id,
        'amount' => 1,
        'method' => 'cash',
        'status' => 'approved',
    ]))->toThrow(ValidationException::class);

    $this->actingAs($owner)
        ->delete("/{$owner->currentTeam->slug}/transactions/refunds/{$refund->id}")
        ->assertSessionHasErrors('refund');
    $this->assertDatabaseHas('transaction_refunds', ['id' => $refund->id]);
});

test('return is rejected for void transactions and cannot exceed the item value', function () {
    $owner = User::factory()->create();
    $product = hardeningProduct($owner);
    $transaction = app(CreatePosTransactionAction::class)->execute($owner->currentTeam, $owner, [
        'items' => [['item_type' => 'product', 'product_id' => $product->id, 'quantity' => 1]],
        'payment_method' => 'cash',
        'paid_amount' => 20000,
    ]);
    $item = $transaction->items()->firstOrFail();

    expect(fn () => app(CreateTransactionReturnAction::class)->execute($owner->currentTeam, $owner, [
        'transaction_item_id' => $item->id,
        'quantity' => 1,
        'refund_amount' => 20001,
        'status' => TransactionReturn::STATUS_APPROVED,
    ]))->toThrow(ValidationException::class);

    app(VoidTransactionAction::class)->execute($owner->currentTeam, $transaction, $owner);

    expect(fn () => app(CreateTransactionReturnAction::class)->execute($owner->currentTeam, $owner, [
        'transaction_item_id' => $item->id,
        'quantity' => 1,
        'refund_amount' => 20000,
        'status' => TransactionReturn::STATUS_APPROVED,
    ]))->toThrow(ValidationException::class);
});

test('deleting a transaction voids it and reverses stock and voucher usage', function () {
    $owner = User::factory()->create();
    $team = $owner->currentTeam;
    $product = hardeningProduct($owner);
    $voucher = Voucher::create([
        'team_id' => $team->id,
        'code' => 'HARDEN10',
        'name' => 'Hardening Voucher',
        'type' => Voucher::TYPE_FIXED,
        'value' => 1000,
        'min_purchase' => 0,
        'usage_limit' => 1,
        'used_count' => 0,
        'is_active' => true,
    ]);
    $transaction = app(CreatePosTransactionAction::class)->execute($team, $owner, [
        'items' => [['item_type' => 'product', 'product_id' => $product->id, 'quantity' => 2]],
        'payment_method' => 'cash',
        'paid_amount' => 39000,
        'voucher_code' => $voucher->code,
    ]);

    expect($product->fresh()->stock)->toBe(8)
        ->and($voucher->fresh()->used_count)->toBe(1);

    $this->actingAs($owner)
        ->delete("/{$team->slug}/transactions/{$transaction->id}")
        ->assertRedirect();

    expect($transaction->fresh()->status)->toBe(Transaction::STATUS_VOID)
        ->and($product->fresh()->stock)->toBe(10)
        ->and($voucher->fresh()->used_count)->toBe(0);
    $this->assertDatabaseHas('transaction_audits', [
        'transaction_id' => $transaction->id,
        'action' => 'voided',
    ]);
});

test('approved returns remain immutable and prevent a later full void', function () {
    $owner = User::factory()->create();
    $team = $owner->currentTeam;
    $product = hardeningProduct($owner);
    $transaction = app(CreatePosTransactionAction::class)->execute($team, $owner, [
        'items' => [['item_type' => 'product', 'product_id' => $product->id, 'quantity' => 2]],
        'payment_method' => 'cash',
        'paid_amount' => 40000,
    ]);
    $return = app(CreateTransactionReturnAction::class)->execute($team, $owner, [
        'transaction_item_id' => $transaction->items()->firstOrFail()->id,
        'quantity' => 1,
        'refund_amount' => 20000,
        'status' => TransactionReturn::STATUS_APPROVED,
        'restock' => true,
    ]);

    expect(fn () => app(VoidTransactionAction::class)->execute($team, $transaction, $owner))
        ->toThrow(ValidationException::class);

    $this->actingAs($owner)
        ->delete("/{$team->slug}/transactions/returns/{$return->id}")
        ->assertSessionHasErrors('return');

    expect($product->fresh()->stock)->toBe(9);
    $this->assertDatabaseHas('transaction_returns', ['id' => $return->id]);
});

test('package and promotion requests reject products from another tenant', function () {
    $owner = User::factory()->create();
    $otherOwner = User::factory()->create();
    $foreignProduct = hardeningProduct($otherOwner);
    $team = $owner->currentTeam;

    $this->actingAs($owner)
        ->post("/{$team->slug}/product-packages", [
            'sku' => 'PKG-HARDEN',
            'name' => 'Paket Lintas Tenant',
            'base_price' => 10000,
            'is_active' => true,
            'items' => [['product_id' => $foreignProduct->id, 'quantity' => 1]],
        ])
        ->assertSessionHasErrors('items.0.product_id');

    $this->actingAs($owner)
        ->post("/{$team->slug}/product-promotions", [
            'name' => 'Promo Lintas Tenant',
            'type' => 'bxgy',
            'is_active' => true,
            'triggers' => [['product_id' => $foreignProduct->id, 'min_quantity' => 1]],
            'rewards' => [['product_id' => $foreignProduct->id, 'quantity' => 1, 'extra_charge' => 0]],
        ])
        ->assertSessionHasErrors(['triggers.0.product_id', 'rewards.0.product_id']);

    $this->assertDatabaseCount('product_packages', 0);
    $this->assertDatabaseCount('product_promotions', 0);
});

test('category access uses the seeded dot permission name', function () {
    $owner = User::factory()->create();
    $team = $owner->currentTeam;
    $member = User::factory()->create();
    $team->members()->attach($member, ['role' => TeamRole::Member->value]);
    $member->switchTeam($team);

    setPermissionsTeamId($team->id);
    $member->givePermissionTo(Permission::findOrCreate('product.category.view', 'web'));

    $this->actingAs($member)
        ->get("/{$team->slug}/product-categories")
        ->assertOk();
});
