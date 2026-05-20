<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_packages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->foreignId('category_id')->nullable()->constrained('product_categories')->nullOnDelete();
            $table->string('sku')->unique();
            $table->string('name');
            $table->text('description')->nullable();
            $table->decimal('base_price', 12, 2);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['team_id', 'is_active']);
        });

        Schema::create('product_package_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('package_id')->constrained('product_packages')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->unsignedInteger('quantity')->default(1);
            $table->string('note')->nullable(); // e.g. "ayam bagian paha atas"
            $table->timestamps();

            $table->index('package_id');
        });

        /**
         * Addon groups represent a "slot" in a package that can be swapped.
         * e.g. "Pilihan Minuman" group allows swapping the default drink.
         *
         * Each group has a default product_id (the item already included in the package)
         * and a list of alternative products (addons) with their extra charge.
         */
        Schema::create('product_package_addon_groups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('package_id')->constrained('product_packages')->cascadeOnDelete();
            $table->string('name'); // e.g. "Pilihan Minuman", "Pilihan Lauk"
            $table->foreignId('default_product_id')->nullable()->constrained('products')->nullOnDelete();
            $table->boolean('is_required')->default(false); // must pick one
            $table->unsignedTinyInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index('package_id');
        });

        Schema::create('product_package_addon_options', function (Blueprint $table) {
            $table->id();
            $table->foreignId('addon_group_id')->constrained('product_package_addon_groups')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->decimal('extra_charge', 12, 2)->default(0); // 0 = free swap, >0 = surcharge
            $table->unsignedTinyInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index('addon_group_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_package_addon_options');
        Schema::dropIfExists('product_package_addon_groups');
        Schema::dropIfExists('product_package_items');
        Schema::dropIfExists('product_packages');
    }
};