<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $tableNames = config('permission.table_names');
        $columnNames = config('permission.column_names');
        $pivotRole       = $columnNames['role_pivot_key']       ?? 'role_id';
        $pivotPermission = $columnNames['permission_pivot_key'] ?? 'permission_id';
        $modelMorphKey   = $columnNames['model_morph_key']      ?? 'model_id';
        $teamForeignKey  = $columnNames['team_foreign_key']     ?? 'team_id';

        Schema::create($tableNames['permissions'], function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('name');
            $table->string('guard_name');
            $table->string('label')->nullable();
            $table->string('description')->nullable();
            $table->string('module')->nullable();
            $table->timestamps();

            $table->unique(['name', 'guard_name']);
        });

        Schema::create($tableNames['roles'], function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('team_id')->nullable();
            $table->string('name');
            $table->string('guard_name');
            $table->string('label')->nullable();
            $table->string('description')->nullable();
            $table->boolean('is_system')->default(false);
            $table->timestamps();

            $table->unique(['team_id', 'name', 'guard_name']);
            $table->foreign('team_id')->references('id')->on('teams')->cascadeOnDelete();
        });

        // ── model_has_permissions ─────────────────────────────
        // WAJIB punya team_id jika config permission.teams = true
        Schema::create($tableNames['model_has_permissions'], function (Blueprint $table) use ($tableNames, $columnNames, $pivotPermission, $modelMorphKey, $teamForeignKey) {
            $table->unsignedBigInteger($pivotPermission);
            $table->string('model_type');
            $table->unsignedBigInteger($modelMorphKey);
            $table->unsignedBigInteger($teamForeignKey)->nullable(); // ← WAJIB ADA

            $table->index([$modelMorphKey, 'model_type'], 'model_has_permissions_model_id_model_type_index');
            $table->index([$teamForeignKey], 'model_has_permissions_team_id_index');

            $table->foreign($pivotPermission)
                ->references('id')
                ->on($tableNames['permissions'])
                ->onDelete('cascade');

            $table->primary(
                [$pivotPermission, $modelMorphKey, 'model_type', $teamForeignKey],
                'model_has_permissions_permission_model_type_primary'
            );
        });

        // ── model_has_roles ───────────────────────────────────
        Schema::create($tableNames['model_has_roles'], function (Blueprint $table) use ($tableNames, $columnNames, $pivotRole, $modelMorphKey, $teamForeignKey) {
            $table->unsignedBigInteger($pivotRole);
            $table->string('model_type');
            $table->unsignedBigInteger($modelMorphKey);
            $table->unsignedBigInteger($teamForeignKey)->nullable();

            $table->index([$modelMorphKey, 'model_type'], 'model_has_roles_model_id_model_type_index');
            $table->index([$teamForeignKey], 'model_has_roles_team_id_index');

            $table->foreign($pivotRole)
                ->references('id')
                ->on($tableNames['roles'])
                ->onDelete('cascade');

            $table->primary(
                [$pivotRole, $modelMorphKey, 'model_type', $teamForeignKey],
                'model_has_roles_role_model_type_primary'
            );
        });

        // ── role_has_permissions ──────────────────────────────
        Schema::create($tableNames['role_has_permissions'], function (Blueprint $table) use ($tableNames, $pivotRole, $pivotPermission) {
            $table->unsignedBigInteger($pivotPermission);
            $table->unsignedBigInteger($pivotRole);

            $table->foreign($pivotPermission)
                ->references('id')
                ->on($tableNames['permissions'])
                ->onDelete('cascade');

            $table->foreign($pivotRole)
                ->references('id')
                ->on($tableNames['roles'])
                ->onDelete('cascade');

            $table->primary([$pivotPermission, $pivotRole], 'role_has_permissions_permission_id_role_id_primary');
        });

        // Clear permission cache
        app('cache')
            ->store(config('permission.cache.store') !== 'default' ? config('permission.cache.store') : null)
            ->forget(config('permission.cache.key'));

        // ── menus ─────────────────────────────────────────────
        Schema::create('menus', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('label');
            $table->string('route')->nullable();
            $table->string('icon')->nullable();
            $table->unsignedBigInteger('parent_id')->nullable();
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->string('module')->nullable();
            $table->timestamps();

            $table->foreign('parent_id')->references('id')->on('menus')->cascadeOnDelete();
        });

        // ── menu_permission ───────────────────────────────────
        Schema::create('menu_permission', function (Blueprint $table) use ($tableNames) {
            $table->id();
            $table->foreignId('menu_id')->constrained()->cascadeOnDelete();
            $table->foreignId('permission_id')
                ->constrained($tableNames['permissions'])
                ->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['menu_id', 'permission_id']);
        });
    }

    public function down(): void
    {
        $tableNames = config('permission.table_names');

        Schema::dropIfExists('menu_permission');
        Schema::dropIfExists('menus');
        Schema::dropIfExists($tableNames['role_has_permissions']);
        Schema::dropIfExists($tableNames['model_has_roles']);
        Schema::dropIfExists($tableNames['model_has_permissions']);
        Schema::dropIfExists($tableNames['roles']);
        Schema::dropIfExists($tableNames['permissions']);
    }
};