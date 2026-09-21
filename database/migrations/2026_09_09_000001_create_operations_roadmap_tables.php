<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('phone', 32);
            $table->string('email')->nullable();
            $table->unsignedBigInteger('points_balance')->default(0);
            $table->timestamps();

            $table->unique(['team_id', 'phone']);
            $table->index(['team_id', 'name']);
        });

        Schema::create('dining_tables', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->unsignedInteger('capacity')->default(1);
            $table->string('status', 24)->default('available');
            $table->timestamps();

            $table->unique(['team_id', 'name']);
            $table->index(['team_id', 'status']);
        });

        Schema::table('transactions', function (Blueprint $table) {
            $table->foreignId('customer_id')->nullable()->after('voucher_id')->constrained()->nullOnDelete();
            $table->foreignId('dining_table_id')->nullable()->after('customer_id')->constrained()->nullOnDelete();
            $table->string('customer_phone', 32)->nullable()->after('customer_name');
            $table->string('customer_email')->nullable()->after('customer_phone');
            $table->unsignedBigInteger('points_redeemed')->default(0)->after('discount_total');
            $table->decimal('points_discount_total', 15, 2)->default(0)->after('points_redeemed');
            $table->index(['team_id', 'created_at']);
        });

        Schema::create('customer_point_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('transaction_id')->nullable()->constrained()->nullOnDelete();
            $table->string('type', 24);
            $table->integer('points');
            $table->unsignedBigInteger('balance_after');
            $table->string('note')->nullable();
            $table->timestamps();

            $table->unique(['customer_id', 'transaction_id', 'type'], 'customer_points_transaction_type_unique');
        });

        Schema::create('stock_transfers', function (Blueprint $table) {
            $table->id();
            $table->string('transfer_number')->unique();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('from_team_id')->constrained('teams')->restrictOnDelete();
            $table->foreignId('to_team_id')->constrained('teams')->restrictOnDelete();
            $table->foreignId('requested_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('shipped_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('received_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status', 24)->default('pending');
            $table->text('note')->nullable();
            $table->timestamp('shipped_at')->nullable();
            $table->timestamp('received_at')->nullable();
            $table->timestamp('canceled_at')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'status']);
            $table->index(['from_team_id', 'created_at']);
            $table->index(['to_team_id', 'created_at']);
        });

        Schema::create('stock_transfer_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_transfer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('from_product_id')->constrained('products')->restrictOnDelete();
            $table->foreignId('to_product_id')->nullable()->constrained('products')->nullOnDelete();
            $table->unsignedInteger('quantity');
            $table->timestamps();

            $table->unique(['stock_transfer_id', 'from_product_id']);
        });

        Schema::create('suppliers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('phone', 32)->nullable();
            $table->string('email')->nullable();
            $table->text('address')->nullable();
            $table->timestamps();

            $table->unique(['team_id', 'name']);
        });

        Schema::create('purchase_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->foreignId('supplier_id')->constrained()->restrictOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('order_number')->unique();
            $table->string('status', 24)->default('ordered');
            $table->decimal('total', 15, 2)->default(0);
            $table->text('note')->nullable();
            $table->date('expected_at')->nullable();
            $table->timestamp('received_at')->nullable();
            $table->timestamps();

            $table->index(['team_id', 'status']);
        });

        Schema::create('purchase_order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->unsignedInteger('quantity');
            $table->unsignedInteger('received_quantity')->default(0);
            $table->decimal('unit_cost', 15, 2);
            $table->timestamps();

            $table->unique(['purchase_order_id', 'product_id']);
        });

        Schema::create('stock_opnames', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('opname_number')->unique();
            $table->string('status', 24)->default('completed');
            $table->text('note')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['team_id', 'created_at']);
        });

        Schema::create('stock_opname_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_opname_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->integer('system_qty');
            $table->integer('physical_qty');
            $table->integer('difference');
            $table->string('note')->nullable();
            $table->timestamps();

            $table->unique(['stock_opname_id', 'product_id']);
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropUnique('products_sku_unique');
            $table->unique(['team_id', 'sku']);
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropUnique(['team_id', 'sku']);
            $table->unique('sku');
        });

        Schema::dropIfExists('stock_opname_items');
        Schema::dropIfExists('stock_opnames');
        Schema::dropIfExists('purchase_order_items');
        Schema::dropIfExists('purchase_orders');
        Schema::dropIfExists('suppliers');
        Schema::dropIfExists('stock_transfer_items');
        Schema::dropIfExists('stock_transfers');
        Schema::dropIfExists('customer_point_transactions');

        Schema::table('transactions', function (Blueprint $table) {
            $table->dropIndex(['team_id', 'created_at']);
            $table->dropConstrainedForeignId('customer_id');
            $table->dropConstrainedForeignId('dining_table_id');
            $table->dropColumn(['customer_phone', 'customer_email', 'points_redeemed', 'points_discount_total']);
        });

        Schema::dropIfExists('dining_tables');
        Schema::dropIfExists('customers');
    }
};
