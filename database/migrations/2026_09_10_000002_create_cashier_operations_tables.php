<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cashier_shifts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('status', 16)->default('open');
            $table->string('open_guard')->nullable()->unique();
            $table->decimal('opening_amount', 15, 2)->default(0);
            $table->decimal('sales_cash_amount', 15, 2)->default(0);
            $table->decimal('refunds_cash_amount', 15, 2)->default(0);
            $table->decimal('cash_in_amount', 15, 2)->default(0);
            $table->decimal('cash_out_amount', 15, 2)->default(0);
            $table->decimal('expected_amount', 15, 2)->nullable();
            $table->decimal('counted_amount', 15, 2)->nullable();
            $table->decimal('difference_amount', 15, 2)->nullable();
            $table->text('opening_note')->nullable();
            $table->text('closing_note')->nullable();
            $table->timestamp('opened_at');
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();

            $table->index(['team_id', 'status']);
            $table->index(['team_id', 'user_id', 'opened_at']);
        });

        Schema::create('cashier_cash_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cashier_shift_id')->constrained()->cascadeOnDelete();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('type', 16);
            $table->decimal('amount', 15, 2);
            $table->string('category', 100);
            $table->text('note')->nullable();
            $table->timestamp('occurred_at');
            $table->timestamps();

            $table->index(['cashier_shift_id', 'occurred_at']);
            $table->index(['team_id', 'type']);
        });

        Schema::create('transaction_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->foreignId('transaction_id')->constrained()->cascadeOnDelete();
            $table->foreignId('cashier_shift_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('payment_method', 32);
            $table->decimal('amount', 15, 2);
            $table->decimal('tendered_amount', 15, 2);
            $table->decimal('change_amount', 15, 2)->default(0);
            $table->timestamp('received_at');
            $table->timestamps();

            $table->index(['cashier_shift_id', 'payment_method']);
            $table->index(['transaction_id', 'received_at']);
        });

        Schema::table('transactions', function (Blueprint $table) {
            $table->foreignId('cashier_shift_id')->nullable()->after('user_id')->constrained()->nullOnDelete();
        });

        Schema::table('transaction_refunds', function (Blueprint $table) {
            $table->foreignId('cashier_shift_id')->nullable()->after('user_id')->constrained()->nullOnDelete();
        });

        Schema::table('transaction_returns', function (Blueprint $table) {
            $table->foreignId('cashier_shift_id')->nullable()->after('user_id')->constrained()->nullOnDelete();
            $table->string('refund_method', 32)->default('cash')->after('refund_amount');
        });
    }

    public function down(): void
    {
        Schema::table('transaction_returns', function (Blueprint $table) {
            $table->dropConstrainedForeignId('cashier_shift_id');
            $table->dropColumn('refund_method');
        });

        Schema::table('transaction_refunds', function (Blueprint $table) {
            $table->dropConstrainedForeignId('cashier_shift_id');
        });

        Schema::table('transactions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('cashier_shift_id');
        });

        Schema::dropIfExists('transaction_payments');
        Schema::dropIfExists('cashier_cash_movements');
        Schema::dropIfExists('cashier_shifts');
    }
};
