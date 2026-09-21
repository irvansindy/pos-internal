<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('product_categories', function (Blueprint $table) {
            $table->dropUnique('product_categories_name_unique');
            $table->unique(['team_id', 'name']);
        });

        Schema::table('product_packages', function (Blueprint $table) {
            $table->dropUnique('product_packages_sku_unique');
            $table->unique(['team_id', 'sku']);
        });
    }

    public function down(): void
    {
        Schema::table('product_categories', function (Blueprint $table) {
            $table->dropUnique(['team_id', 'name']);
            $table->unique('name');
        });

        Schema::table('product_packages', function (Blueprint $table) {
            $table->dropUnique(['team_id', 'sku']);
            $table->unique('sku');
        });
    }
};
