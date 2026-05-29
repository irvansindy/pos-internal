<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transaction_refunds', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('team_id')->index();
            $table->unsignedBigInteger('transaction_id')->index();
            $table->unsignedBigInteger('user_id')->nullable()->index();
            $table->string('refund_number')->unique();
            $table->decimal('amount', 15, 2);
            $table->string('method', 32)->default('cash');
            $table->string('status', 32)->default('approved');
            $table->text('reason')->nullable();
            $table->timestamp('refunded_at')->nullable();
            $table->timestamps();

            $table->foreign('team_id')->references('id')->on('teams')->cascadeOnDelete();
            $table->foreign('transaction_id')->references('id')->on('transactions')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
        });

        Schema::create('transaction_returns', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('team_id')->index();
            $table->unsignedBigInteger('transaction_id')->index();
            $table->unsignedBigInteger('transaction_item_id')->index();
            $table->unsignedBigInteger('product_id')->nullable()->index();
            $table->unsignedBigInteger('user_id')->nullable()->index();
            $table->string('return_number')->unique();
            $table->unsignedInteger('quantity');
            $table->decimal('refund_amount', 15, 2)->default(0);
            $table->boolean('restock')->default(true);
            $table->string('status', 32)->default('approved');
            $table->text('reason')->nullable();
            $table->timestamp('returned_at')->nullable();
            $table->timestamps();

            $table->foreign('team_id')->references('id')->on('teams')->cascadeOnDelete();
            $table->foreign('transaction_id')->references('id')->on('transactions')->cascadeOnDelete();
            $table->foreign('transaction_item_id')->references('id')->on('transaction_items')->cascadeOnDelete();
            $table->foreign('product_id')->references('id')->on('products')->nullOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transaction_returns');
        Schema::dropIfExists('transaction_refunds');
    }
};
