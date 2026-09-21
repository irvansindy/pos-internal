<?php

use App\Actions\CashierShift\CloseCashierShiftAction;
use App\Actions\CashierShift\OpenCashierShiftAction;
use App\Actions\CashierShift\RecordCashMovementAction;
use App\Actions\Pos\CreatePosTransactionAction;
use App\Actions\Pos\ProcessTransactionPaymentAction;
use App\Actions\Transaction\CreateTransactionRefundAction;
use App\Models\CashierCashMovement;
use App\Models\CashierShift;
use App\Models\Product;
use App\Models\TransactionPayment;
use App\Models\User;
use Database\Seeders\MenuSeeder;
use Database\Seeders\PermissionSeeder;
use Illuminate\Validation\ValidationException;
use Inertia\Testing\AssertableInertia as Assert;

test('owner can open a shift and view cashier operations', function () {
    $owner = User::factory()->create();
    $team = $owner->currentTeam;

    $this->actingAs($owner)
        ->post("/{$team->slug}/cashier-operations/open", [
            'opening_amount' => 500000,
            'opening_note' => 'Modal lima ratus ribu',
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('cashier_shifts', [
        'team_id' => $team->id,
        'user_id' => $owner->id,
        'status' => CashierShift::STATUS_OPEN,
        'opening_amount' => 500000,
    ]);

    $this->actingAs($owner)
        ->get("/{$team->slug}/cashier-operations")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('cashier-operations/index')
            ->where('activeShift.user_id', $owner->id)
            ->where('activeShift.live_summary.expected_amount', 500000)
        );
});

test('cashier operations sidebar item resolves to the team scoped route', function () {
    $this->seed([PermissionSeeder::class, MenuSeeder::class]);

    $owner = User::factory()->create();
    $team = $owner->currentTeam;

    $this->actingAs($owner)
        ->get(route('cashier-operations.index', ['current_team' => $team->slug]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('cashier-operations/index')
            ->where('navigation.3.route', 'cashier-operations.index')
            ->where('navigation.3.href', "/{$team->slug}/cashier-operations")
        );
});

test('a cashier cannot have two active shifts in the same store', function () {
    $owner = User::factory()->create();
    $team = $owner->currentTeam;
    $action = app(OpenCashierShiftAction::class);

    $action->execute($team, $owner, ['opening_amount' => 100000]);

    expect(fn () => $action->execute($team, $owner, ['opening_amount' => 200000]))
        ->toThrow(ValidationException::class);

    expect(CashierShift::where('team_id', $team->id)->count())->toBe(1);
});

test('cashier closing reconciliation uses payment ledger and cash movements', function () {
    $owner = User::factory()->create();
    $team = $owner->currentTeam;
    $shift = app(OpenCashierShiftAction::class)->execute($team, $owner, [
        'opening_amount' => 100000,
    ]);
    $product = Product::create([
        'team_id' => $team->id,
        'name' => 'Kopi Harian',
        'sku' => 'KOPI-HARIAN',
        'price' => 50000,
        'stock' => 10,
        'is_active' => true,
    ]);

    $transaction = app(CreatePosTransactionAction::class)->execute($team, $owner, [
        'items' => [['item_type' => 'product', 'product_id' => $product->id, 'quantity' => 1]],
        'payment_method' => 'cash',
        'paid_amount' => 50000,
    ]);

    app(RecordCashMovementAction::class)->execute($team, $owner, $shift, [
        'type' => CashierCashMovement::TYPE_IN,
        'amount' => 20000,
        'category' => 'Tambahan pecahan',
    ]);
    app(RecordCashMovementAction::class)->execute($team, $owner, $shift, [
        'type' => CashierCashMovement::TYPE_OUT,
        'amount' => 10000,
        'category' => 'Belanja operasional',
    ]);
    app(CreateTransactionRefundAction::class)->execute($team, $owner, [
        'transaction_id' => $transaction->id,
        'amount' => 5000,
        'method' => 'cash',
        'status' => 'approved',
        'reason' => 'Koreksi pesanan',
    ]);

    $closed = app(CloseCashierShiftAction::class)->execute($team, $owner, $shift, [
        'counted_amount' => 150000,
        'closing_note' => 'Kurang lima ribu',
    ]);

    expect($transaction->cashier_shift_id)->toBe($shift->id)
        ->and(TransactionPayment::where('transaction_id', $transaction->id)->value('cashier_shift_id'))->toBe($shift->id)
        ->and((float) $closed->sales_cash_amount)->toBe(50000.0)
        ->and((float) $closed->refunds_cash_amount)->toBe(5000.0)
        ->and((float) $closed->cash_in_amount)->toBe(20000.0)
        ->and((float) $closed->cash_out_amount)->toBe(10000.0)
        ->and((float) $closed->expected_amount)->toBe(155000.0)
        ->and((float) $closed->counted_amount)->toBe(150000.0)
        ->and((float) $closed->difference_amount)->toBe(-5000.0)
        ->and($closed->status)->toBe(CashierShift::STATUS_CLOSED)
        ->and($closed->open_guard)->toBeNull();
});

test('paid POS checkout requires an active cashier shift', function () {
    $owner = User::factory()->create();
    $team = $owner->currentTeam;
    $product = Product::create([
        'team_id' => $team->id,
        'name' => 'Teh Tunai',
        'sku' => 'TEH-TUNAI',
        'price' => 10000,
        'stock' => 10,
        'is_active' => true,
    ]);

    $this->actingAs($owner)
        ->post("/{$team->slug}/pos/transaction", [
            'items' => [['item_type' => 'product', 'item_id' => $product->id, 'quantity' => 1]],
            'payment_method' => 'cash',
            'paid_amount' => 10000,
        ])
        ->assertSessionHasErrors('cashier_shift');

    $this->assertDatabaseMissing('transactions', ['team_id' => $team->id]);
});

test('partial and follow-up payments are recorded against the active shift', function () {
    $owner = User::factory()->create();
    $team = $owner->currentTeam;
    $shift = app(OpenCashierShiftAction::class)->execute($team, $owner, [
        'opening_amount' => 0,
    ]);
    $product = Product::create([
        'team_id' => $team->id,
        'name' => 'Roti Kasir',
        'sku' => 'ROTI-KASIR',
        'price' => 20000,
        'stock' => 10,
        'is_active' => true,
    ]);
    $transaction = app(CreatePosTransactionAction::class)->execute($team, $owner, [
        'items' => [['item_type' => 'product', 'product_id' => $product->id, 'quantity' => 1]],
        'payment_method' => 'cash',
        'paid_amount' => 5000,
    ]);

    app(ProcessTransactionPaymentAction::class)->execute($team, $transaction, [
        'payment_method' => 'cash',
        'paid_amount' => 20000,
    ], $owner);

    $payments = TransactionPayment::where('transaction_id', $transaction->id)->get();

    expect($payments)->toHaveCount(2)
        ->and((float) $payments->sum('amount'))->toBe(20000.0)
        ->and((float) $payments->sum('tendered_amount'))->toBe(25000.0)
        ->and((float) $payments->sum('change_amount'))->toBe(5000.0)
        ->and($payments->pluck('cashier_shift_id')->unique()->all())->toBe([$shift->id]);
});

test('a user cannot record movement or close another cashier shift', function () {
    $owner = User::factory()->create();
    $team = $owner->currentTeam;
    $other = User::factory()->create();
    $team->members()->attach($other, ['role' => 'member']);
    $other->switchTeam($team);
    $shift = app(OpenCashierShiftAction::class)->execute($team, $owner, [
        'opening_amount' => 100000,
    ]);

    expect(fn () => app(RecordCashMovementAction::class)->execute($team, $other, $shift, [
        'type' => CashierCashMovement::TYPE_OUT,
        'amount' => 1000,
        'category' => 'Tidak sah',
    ]))->toThrow(Exception::class);

    expect(fn () => app(CloseCashierShiftAction::class)->execute($team, $other, $shift, [
        'counted_amount' => 100000,
    ]))->toThrow(Exception::class);

    expect($shift->fresh()->status)->toBe(CashierShift::STATUS_OPEN);
});
