<?php

use App\Enums\TeamRole;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('owner can view and create transactions for the current team', function () {
    $owner = User::factory()->create();
    $team = $owner->currentTeam;

    $response = $this
        ->actingAs($owner)
        ->get("/{$team->slug}/transactions");

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('canManage', true)
            ->where('teamSlug', $team->slug)
        );

    $response = $this
        ->actingAs($owner)
        ->post("/{$team->slug}/transactions", [
            'customer_name' => 'Pembelian alat tulis',
            'grand_total' => 150000,
            'transaction_date' => now()->toDateString(),
            'payment_status' => 'paid',
            'payment_method' => 'cash',
            'paid_amount' => 150000,
            'note' => 'Pembayaran tunai',
        ]);

    $response->assertRedirect();

    $this->assertDatabaseHas('transactions', [
        'team_id' => $team->id,
        'customer_name' => 'Pembelian alat tulis',
        'grand_total' => 150000,
        'payment_status' => 'paid',
    ]);
});

test('team members can view but cannot create transactions', function () {
    $owner = User::factory()->create();
    $team = $owner->currentTeam;

    $member = User::factory()->create();
    $team->members()->attach($member, ['role' => TeamRole::Member->value]);
    $member->switchTeam($team);

    $response = $this
        ->actingAs($member)
        ->get("/{$team->slug}/transactions");

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('canManage', false)
        );

    $response = $this
        ->actingAs($member)
        ->post("/{$team->slug}/transactions", [
            'customer_name' => 'Pembelian tidak sah',
            'grand_total' => 1000,
            'payment_status' => 'paid',
            'payment_method' => 'cash',
            'paid_amount' => 1000,
        ]);

    $response->assertRedirect();
});

test('owner updates a transaction and records an audit trail', function () {
    $owner = User::factory()->create();
    $team = $owner->currentTeam;

    $transaction = Transaction::create([
        'team_id' => $team->id,
        'user_id' => $owner->id,
        'invoice_number' => 'TRX-'.now()->format('Ymd').'-0001',
        'customer_name' => 'Transaksi awal',
        'status' => Transaction::STATUS_PENDING,
        'payment_status' => Transaction::PAYMENT_STATUS_UNPAID,
        'subtotal' => 50000,
        'discount_total' => 0,
        'tax_total' => 0,
        'grand_total' => 50000,
        'paid_amount' => 0,
        'change_amount' => 0,
        'note' => 'Awal',
    ]);

    $response = $this
        ->actingAs($owner)
        ->put("/{$team->slug}/transactions/{$transaction->id}", [
            'customer_name' => 'Transaksi diperbarui',
            'grand_total' => 75000,
            'transaction_date' => now()->toDateString(),
            'payment_status' => 'partial',
            'payment_method' => 'transfer',
            'paid_amount' => 25000,
            'note' => 'Pembayaran sebagian',
        ]);

    $response->assertRedirect();

    $this->assertDatabaseHas('transactions', [
        'id' => $transaction->id,
        'customer_name' => 'Transaksi diperbarui',
        'grand_total' => 75000,
    ]);

    $this->assertDatabaseHas('transaction_audits', [
        'transaction_id' => $transaction->id,
        'action' => 'updated',
    ]);
});
