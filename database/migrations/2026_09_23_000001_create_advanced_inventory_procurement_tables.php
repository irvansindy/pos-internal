<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->boolean('tracks_serials')->default(false)->after('tracks_batches');
        });

        Schema::create('warehouses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->string('code', 32);
            $table->string('name');
            $table->boolean('is_default')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['team_id', 'code']);
        });

        Schema::create('warehouse_bins', function (Blueprint $table) {
            $table->id();
            $table->foreignId('warehouse_id')->constrained()->cascadeOnDelete();
            $table->string('code', 48);
            $table->string('name');
            $table->boolean('is_default')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['warehouse_id', 'code']);
        });

        Schema::create('inventory_location_balances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->foreignId('warehouse_id')->constrained()->cascadeOnDelete();
            $table->foreignId('warehouse_bin_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('inventory_batch_id')->nullable()->constrained()->cascadeOnDelete();
            $table->unsignedInteger('quantity')->default(0);
            $table->timestamps();

            $table->unique(
                ['warehouse_bin_id', 'product_id', 'inventory_batch_id'],
                'inventory_location_balance_unique'
            );
            $table->index(['team_id', 'product_id']);
        });

        Schema::create('inventory_location_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('warehouse_bin_id')->constrained()->restrictOnDelete();
            $table->foreignId('inventory_batch_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('product_stock_movement_id')->constrained()->cascadeOnDelete();
            $table->string('type', 20);
            $table->unsignedInteger('quantity');
            $table->unsignedInteger('quantity_before');
            $table->unsignedInteger('quantity_after');
            $table->timestamps();
        });

        Schema::create('inventory_serials', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('inventory_batch_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('warehouse_bin_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('purchase_order_item_id')->nullable()->constrained()->nullOnDelete();
            $table->string('serial_number', 160);
            $table->string('status', 24)->default('in_stock');
            $table->timestamps();

            $table->unique(['team_id', 'serial_number']);
            $table->index(['product_id', 'status']);
        });

        Schema::create('transaction_item_serials', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transaction_item_id')->constrained()->cascadeOnDelete();
            $table->foreignId('inventory_serial_id')->nullable()->constrained()->nullOnDelete();
            $table->string('serial_number', 160);
            $table->timestamps();

            $table->index('serial_number');
        });

        Schema::create('purchase_invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->foreignId('supplier_id')->constrained()->restrictOnDelete();
            $table->foreignId('purchase_order_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('document_number')->unique();
            $table->string('supplier_invoice_number');
            $table->date('invoice_date');
            $table->date('due_date')->nullable();
            $table->string('status', 24)->default('unpaid');
            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('landed_cost_total', 15, 2)->default(0);
            $table->decimal('return_total', 15, 2)->default(0);
            $table->decimal('paid_total', 15, 2)->default(0);
            $table->decimal('balance_due', 15, 2)->default(0);
            $table->text('note')->nullable();
            $table->timestamps();

            $table->unique(['team_id', 'supplier_id', 'supplier_invoice_number'], 'purchase_invoice_supplier_number_unique');
            $table->index(['team_id', 'status', 'due_date']);
        });

        Schema::create('purchase_invoice_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_invoice_id')->constrained()->cascadeOnDelete();
            $table->foreignId('purchase_order_item_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->unsignedInteger('quantity');
            $table->decimal('unit_cost', 15, 2);
            $table->decimal('subtotal', 15, 2);
            $table->decimal('landed_cost_amount', 15, 2)->default(0);
            $table->unsignedInteger('returned_quantity')->default(0);
            $table->timestamps();

            $table->unique(['purchase_invoice_id', 'product_id']);
        });

        Schema::create('purchase_invoice_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->foreignId('purchase_invoice_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('payment_number')->unique();
            $table->date('paid_at');
            $table->decimal('amount', 15, 2);
            $table->string('method', 32);
            $table->string('reference')->nullable();
            $table->text('note')->nullable();
            $table->timestamps();
        });

        Schema::create('supplier_returns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->foreignId('supplier_id')->constrained()->restrictOnDelete();
            $table->foreignId('purchase_invoice_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('return_number')->unique();
            $table->string('status', 24)->default('completed');
            $table->date('returned_at');
            $table->decimal('total', 15, 2)->default(0);
            $table->text('note')->nullable();
            $table->timestamps();

            $table->index(['team_id', 'returned_at']);
        });

        Schema::create('supplier_return_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_return_id')->constrained()->cascadeOnDelete();
            $table->foreignId('purchase_invoice_item_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->foreignId('inventory_batch_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('warehouse_bin_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedInteger('quantity');
            $table->decimal('unit_cost', 15, 2);
            $table->decimal('subtotal', 15, 2);
            $table->timestamps();
        });

        Schema::create('landed_costs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->foreignId('purchase_invoice_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('allocation_number')->unique();
            $table->string('description');
            $table->decimal('amount', 15, 2);
            $table->string('allocation_method', 24);
            $table->timestamps();
        });

        Schema::create('landed_cost_allocations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('landed_cost_id')->constrained()->cascadeOnDelete();
            $table->foreignId('purchase_invoice_item_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 15, 2);
            $table->timestamps();

            $table->unique(['landed_cost_id', 'purchase_invoice_item_id'], 'landed_cost_item_unique');
        });

        Schema::create('stock_transfer_batch_allocations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_transfer_item_id')->constrained()->cascadeOnDelete();
            $table->foreignId('from_inventory_batch_id')->constrained('inventory_batches')->restrictOnDelete();
            $table->foreignId('to_inventory_batch_id')->nullable()->constrained('inventory_batches')->nullOnDelete();
            $table->foreignId('from_warehouse_bin_id')->nullable()->constrained('warehouse_bins')->nullOnDelete();
            $table->foreignId('to_warehouse_bin_id')->nullable()->constrained('warehouse_bins')->nullOnDelete();
            $table->unsignedInteger('quantity');
            $table->timestamps();

            $table->unique(['stock_transfer_item_id', 'from_inventory_batch_id'], 'stock_transfer_batch_unique');
        });

        Schema::create('stock_transfer_serials', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_transfer_item_id')->constrained()->cascadeOnDelete();
            $table->foreignId('inventory_serial_id')->constrained()->restrictOnDelete();
            $table->timestamps();

            $table->unique('inventory_serial_id');
        });

        $this->createDefaultLocations();
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_transfer_serials');
        Schema::dropIfExists('stock_transfer_batch_allocations');
        Schema::dropIfExists('landed_cost_allocations');
        Schema::dropIfExists('landed_costs');
        Schema::dropIfExists('supplier_return_items');
        Schema::dropIfExists('supplier_returns');
        Schema::dropIfExists('purchase_invoice_payments');
        Schema::dropIfExists('purchase_invoice_items');
        Schema::dropIfExists('purchase_invoices');
        Schema::dropIfExists('transaction_item_serials');
        Schema::dropIfExists('inventory_serials');
        Schema::dropIfExists('inventory_location_movements');
        Schema::dropIfExists('inventory_location_balances');
        Schema::dropIfExists('warehouse_bins');
        Schema::dropIfExists('warehouses');

        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('tracks_serials');
        });
    }

    private function createDefaultLocations(): void
    {
        $now = now();

        DB::table('teams')->orderBy('id')->each(function (object $team) use ($now) {
            $warehouseId = DB::table('warehouses')->insertGetId([
                'team_id' => $team->id,
                'code' => 'UTAMA',
                'name' => 'Gudang Utama',
                'is_default' => true,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            $binId = DB::table('warehouse_bins')->insertGetId([
                'warehouse_id' => $warehouseId,
                'code' => 'DEFAULT',
                'name' => 'Penyimpanan Utama',
                'is_default' => true,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            DB::table('products')
                ->where('team_id', $team->id)
                ->where('stock', '>', 0)
                ->orderBy('id')
                ->each(function (object $product) use ($team, $warehouseId, $binId, $now) {
                    $batches = DB::table('inventory_batches')
                        ->where('product_id', $product->id)
                        ->where('quantity', '>', 0)
                        ->get();

                    if ($batches->isEmpty()) {
                        DB::table('inventory_location_balances')->insert([
                            'team_id' => $team->id,
                            'warehouse_id' => $warehouseId,
                            'warehouse_bin_id' => $binId,
                            'product_id' => $product->id,
                            'inventory_batch_id' => null,
                            'quantity' => $product->stock,
                            'created_at' => $now,
                            'updated_at' => $now,
                        ]);

                        return;
                    }

                    foreach ($batches as $batch) {
                        DB::table('inventory_location_balances')->insert([
                            'team_id' => $team->id,
                            'warehouse_id' => $warehouseId,
                            'warehouse_bin_id' => $binId,
                            'product_id' => $product->id,
                            'inventory_batch_id' => $batch->id,
                            'quantity' => $batch->quantity,
                            'created_at' => $now,
                            'updated_at' => $now,
                        ]);
                    }
                });
        });
    }
};
