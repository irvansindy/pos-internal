<?php

use App\Actions\Organizations\UpgradePlanAction;
use App\Actions\Teams\CreateTeam;
use App\Enums\OrganizationRole;
use App\Exceptions\StoreQuotaExceededException;
use App\Models\Organization;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Support\Facades\Route;

test('the organization stores page can be rendered', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->get(route('organizations.stores'));

    $response->assertOk();
});

test('the legacy plan upgrade route is unavailable', function () {
    $user = User::factory()->create();

    expect(Route::has('organizations.upgrade'))->toBeFalse();
    $this
        ->actingAs($user)
        ->post('/settings/organization/upgrade', ['plan_code' => 'premium'])
        ->assertNotFound();
});

test('upgrade action refuses a plan smaller than the current store count', function () {
    $user = User::factory()->create();
    $organization = Organization::factory()->create();

    $organization->memberships()->create([
        'user_id' => $user->id,
        'role' => OrganizationRole::Owner,
    ]);

    $bigPlan = Plan::factory()->create(['max_stores' => 5]);
    Subscription::factory()->active()->create([
        'organization_id' => $organization->id,
        'plan_id' => $bigPlan->id,
    ]);

    $user->switchOrganization($organization);

    // Fill 3 stores under this organization.
    (new CreateTeam)->handle($user, 'Toko A', $organization);
    (new CreateTeam)->handle($user, 'Toko B', $organization);
    (new CreateTeam)->handle($user, 'Toko C', $organization);

    $smallPlan = Plan::factory()->create(['max_stores' => 1]);

    expect(fn () => (new UpgradePlanAction)->execute($organization, $smallPlan))
        ->toThrow(StoreQuotaExceededException::class);
});
