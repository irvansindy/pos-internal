<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transaction_items', function (Blueprint $table) {
            $table->string('item_type', 32)->default('product')->after('product_id');
            $table->unsignedBigInteger('item_reference_id')->nullable()->after('item_type');

            $table->index(['item_type', 'item_reference_id']);
        });
    }

    public function down(): void
    {
        Schema::table('transaction_items', function (Blueprint $table) {
            $table->dropIndex(['item_type', 'item_reference_id']);
            $table->dropColumn(['item_type', 'item_reference_id']);
        });
    }
};
