<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->foreignId('parent_product_id')->nullable()->after('category_id')->constrained('products')->nullOnDelete();
            $table->string('variant_name')->nullable()->after('name');
            $table->string('barcode')->nullable()->after('sku');
            $table->string('base_unit', 32)->default('pcs')->after('barcode');
            $table->boolean('tracks_batches')->default(false)->after('min_stock');
            $table->unique(['team_id', 'barcode']);
        });

        Schema::create('product_units', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('abbreviation', 32);
            $table->unsignedInteger('conversion_quantity');
            $table->string('barcode')->nullable();
            $table->decimal('selling_price', 15, 2);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['product_id', 'name']);
            $table->unique(['team_id', 'barcode']);
        });

        Schema::create('inventory_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('purchase_order_item_id')->nullable()->constrained()->nullOnDelete();
            $table->string('batch_number');
            $table->date('expires_at')->nullable();
            $table->unsignedInteger('quantity')->default(0);
            $table->timestamps();

            $table->unique(['team_id', 'product_id', 'batch_number']);
            $table->index(['product_id', 'expires_at']);
        });

        Schema::create('inventory_batch_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('inventory_batch_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_stock_movement_id')->constrained()->cascadeOnDelete();
            $table->string('type', 20);
            $table->unsignedInteger('quantity');
            $table->unsignedInteger('quantity_before');
            $table->unsignedInteger('quantity_after');
            $table->timestamps();
        });

        Schema::table('transaction_items', function (Blueprint $table) {
            $table->foreignId('product_unit_id')->nullable()->after('product_id')->constrained()->nullOnDelete();
            $table->string('unit_name', 32)->nullable()->after('product_sku');
            $table->unsignedInteger('unit_conversion')->default(1)->after('unit_name');
            $table->unsignedInteger('base_quantity')->nullable()->after('quantity');
        });
    }

    public function down(): void
    {
        Schema::table('transaction_items', function (Blueprint $table) {
            $table->dropConstrainedForeignId('product_unit_id');
            $table->dropColumn(['unit_name', 'unit_conversion', 'base_quantity']);
        });
        Schema::dropIfExists('inventory_batch_movements');
        Schema::dropIfExists('inventory_batches');
        Schema::dropIfExists('product_units');
        Schema::table('products', function (Blueprint $table) {
            $table->dropUnique(['team_id', 'barcode']);
            $table->dropConstrainedForeignId('parent_product_id');
            $table->dropColumn(['variant_name', 'barcode', 'base_unit', 'tracks_batches']);
        });
    }
};
