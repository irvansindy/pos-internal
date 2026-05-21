<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        /**
         * Tabel utama promosi.
         * type = 'bxgy' untuk Buy X Get Y.
         * Bisa diperluas ke tipe lain ('discount', 'bundle', dll) di masa depan.
         */
        Schema::create('product_promotions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->string('name');                    // "Beli Ayam 2 Gratis 1"
            $table->text('description')->nullable();
            $table->string('type')->default('bxgy');   // extensible
            $table->boolean('is_active')->default(true);
            $table->date('starts_at')->nullable();      // null = tidak dibatasi waktu
            $table->date('ends_at')->nullable();
            $table->timestamps();

            $table->index(['team_id', 'type', 'is_active']);
        });

        /**
         * Syarat pembelian (trigger conditions).
         * "Beli product_id sebanyak min_quantity"
         * Satu promosi bisa punya lebih dari satu syarat (AND logic).
         */
        Schema::create('product_promotion_triggers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('promotion_id')->constrained('product_promotions')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->unsignedInteger('min_quantity');    // minimal beli N unit
            $table->timestamps();

            $table->index('promotion_id');
        });

        /**
         * Reward / hadiah yang didapat.
         * "Dapat product_id sebanyak quantity, gratis (extra_charge = 0)
         *  atau dengan diskon extra_charge dari harga normal."
         * Satu promosi bisa memberi lebih dari satu reward.
         */
        Schema::create('product_promotion_rewards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('promotion_id')->constrained('product_promotions')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->unsignedInteger('quantity');        // dapat N unit
            $table->decimal('extra_charge', 12, 2)->default(0); // 0 = full gratis
            $table->timestamps();

            $table->index('promotion_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_promotion_rewards');
        Schema::dropIfExists('product_promotion_triggers');
        Schema::dropIfExists('product_promotions');
    }
};