<?php

use App\Enums\SubscriptionStatus;
use App\Models\Organization;
use App\Models\Plan;
use App\Models\PlatformAdminAudit;
use App\Models\Subscription;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('only platform admins can access the control plane dashboard', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->get('/admin')->assertForbidden();

    $user->forceFill(['is_platform_admin' => true])->save();

    $this->actingAs($user)
        ->get('/admin')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/dashboard')
            ->where('auth.user.is_platform_admin', true)
            ->has('metrics.organizations')
            ->has('subscriptionStatusCounts')
        );
});

test('platform admin can search organizations and inspect tenant details', function () {
    $admin = User::factory()->create();
    $admin->forceFill(['is_platform_admin' => true])->save();
    $organization = Organization::factory()->create(['name' => 'Kopi Nusantara']);
    $plan = Plan::factory()->create(['code' => 'growth', 'name' => 'Growth']);
    Subscription::factory()->active()->create([
        'organization_id' => $organization->id,
        'plan_id' => $plan->id,
    ]);

    $this->actingAs($admin)
        ->get('/admin/organizations?search=Kopi&status=active&plan=growth')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/organizations/index')
            ->has('organizations.data', 1)
            ->where('organizations.data.0.name', 'Kopi Nusantara')
            ->where('organizations.data.0.subscription_status', 'active')
        );

    $this->actingAs($admin)
        ->get("/admin/organizations/{$organization->slug}")
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/organizations/show')
            ->where('organization.id', $organization->id)
            ->where('organization.subscription.plan.name', 'Growth')
        );
});

test('subscription intervention requires a reason and creates an audit record', function () {
    $admin = User::factory()->create();
    $admin->forceFill(['is_platform_admin' => true])->save();
    $organization = Organization::factory()->create();
    $subscription = Subscription::factory()->active()->create([
        'organization_id' => $organization->id,
    ]);

    $this->actingAs($admin)
        ->put("/admin/organizations/{$organization->slug}/subscription-status", [
            'status' => SubscriptionStatus::Suspended->value,
            'reason' => '',
        ])
        ->assertSessionHasErrors('reason');

    $this->actingAs($admin)
        ->put("/admin/organizations/{$organization->slug}/subscription-status", [
            'status' => SubscriptionStatus::Suspended->value,
            'reason' => 'Investigasi pembayaran ganda pada tiket CS-120.',
        ])
        ->assertRedirect();

    expect($subscription->fresh()->status)->toBe(SubscriptionStatus::Suspended);

    $this->assertDatabaseHas('platform_admin_audits', [
        'organization_id' => $organization->id,
        'actor_id' => $admin->id,
        'action' => 'subscription.status_updated',
        'target_id' => $subscription->id,
        'reason' => 'Investigasi pembayaran ganda pada tiket CS-120.',
    ]);

    $audit = PlatformAdminAudit::latest()->first();
    expect($audit->before['status'])->toBe('active')
        ->and($audit->after['status'])->toBe('suspended');
});

test('reactivating a canceled subscription clears its cancellation marker', function () {
    $admin = User::factory()->create();
    $admin->forceFill(['is_platform_admin' => true])->save();
    $organization = Organization::factory()->create();
    $subscription = Subscription::factory()->create([
        'organization_id' => $organization->id,
        'status' => SubscriptionStatus::Canceled,
        'canceled_at' => now()->subDay(),
    ]);

    $this->actingAs($admin)
        ->put("/admin/organizations/{$organization->slug}/subscription-status", [
            'status' => SubscriptionStatus::Active->value,
            'reason' => 'Pembayaran manual telah diverifikasi oleh finance.',
        ])
        ->assertRedirect();

    expect($subscription->fresh()->status)->toBe(SubscriptionStatus::Active)
        ->and($subscription->fresh()->canceled_at)->toBeNull();
});

test('platform admin can update plan pricing and the change is audited', function () {
    $admin = User::factory()->create();
    $admin->forceFill(['is_platform_admin' => true])->save();
    $plan = Plan::factory()->create([
        'name' => 'Basic',
        'max_stores' => 1,
        'max_owners' => 1,
        'price_monthly' => 150000,
        'price_yearly' => 1500000,
    ]);

    $this->actingAs($admin)
        ->put("/admin/plans/{$plan->id}", [
            'name' => 'Basic Baru',
            'max_stores' => 2,
            'max_owners' => 1,
            'price_monthly' => 175000,
            'price_yearly' => 1750000,
            'is_active' => true,
            'reason' => 'Penyesuaian katalog untuk periode berikutnya.',
        ])
        ->assertRedirect();

    expect($plan->fresh()->name)->toBe('Basic Baru')
        ->and((float) $plan->fresh()->price_monthly)->toBe(175000.0)
        ->and($plan->fresh()->max_stores)->toBe(2);

    $this->assertDatabaseHas('platform_admin_audits', [
        'actor_id' => $admin->id,
        'action' => 'plan.updated',
        'target_id' => $plan->id,
    ]);
});

test('non admins cannot mutate subscriptions or plans', function () {
    $user = User::factory()->create();
    $organization = Organization::factory()->create();
    $subscription = Subscription::factory()->active()->create([
        'organization_id' => $organization->id,
    ]);
    $plan = $subscription->plan;

    $this->actingAs($user)
        ->put("/admin/organizations/{$organization->slug}/subscription-status", [
            'status' => 'suspended',
            'reason' => 'Tidak memiliki hak akses.',
        ])
        ->assertForbidden();

    $this->actingAs($user)
        ->put("/admin/plans/{$plan->id}", [
            'name' => 'Tidak Sah',
            'max_stores' => 1,
            'max_owners' => 1,
            'price_monthly' => 1,
            'price_yearly' => 1,
            'is_active' => true,
            'reason' => 'Tidak memiliki hak akses.',
        ])
        ->assertForbidden();

    expect($subscription->fresh()->status)->toBe(SubscriptionStatus::Active)
        ->and($plan->fresh()->name)->not->toBe('Tidak Sah')
        ->and(PlatformAdminAudit::count())->toBe(0);
});
