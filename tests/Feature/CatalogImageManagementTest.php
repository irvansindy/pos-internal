<?php

use App\Actions\Product\CreateProductAction;
use App\Actions\Product\DeleteProductAction;
use App\Actions\Product\UpdateProductAction;
use App\Actions\ProductPackage\CreateProductPackageAction;
use App\Actions\ProductPackage\DeleteProductPackageAction;
use App\Actions\ProductPromotion\CreateProductPromotionAction;
use App\Actions\ProductPromotion\DeleteProductPromotionAction;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

function catalogImageProduct(User $owner, array $overrides = []): Product
{
    return Product::create(array_merge([
        'team_id' => $owner->currentTeam->id,
        'name' => 'Produk Foto',
        'sku' => 'IMG-'.fake()->unique()->numerify('####'),
        'price' => 15000,
        'stock' => 20,
        'min_stock' => 0,
        'is_active' => true,
    ], $overrides));
}

test('product image can be created replaced removed and cleaned up on delete', function () {
    Storage::fake('public');

    $owner = User::factory()->create();
    $team = $owner->currentTeam;
    $product = app(CreateProductAction::class)->execute($team, [
        'sku' => 'IMG-PRODUCT',
        'name' => 'Produk Bergambar',
        'price' => 25000,
        'stock' => 10,
        'image' => UploadedFile::fake()->image('awal.jpg', 600, 600),
    ]);

    $initialPath = $product->image_path;
    Storage::disk('public')->assertExists($initialPath);
    expect($product->image_url)
        ->toBe('/storage/'.$initialPath)
        ->not->toStartWith('http');

    app(UpdateProductAction::class)->execute($product, [
        'image' => UploadedFile::fake()->image('pengganti.webp', 600, 600),
    ]);

    $replacementPath = $product->fresh()->image_path;
    expect($replacementPath)->not->toBe($initialPath);
    Storage::disk('public')->assertMissing($initialPath);
    Storage::disk('public')->assertExists($replacementPath);

    app(UpdateProductAction::class)->execute($product->fresh(), [
        'remove_image' => true,
    ]);

    expect($product->fresh()->image_path)->toBeNull();
    Storage::disk('public')->assertMissing($replacementPath);

    app(UpdateProductAction::class)->execute($product->fresh(), [
        'image' => UploadedFile::fake()->image('terakhir.png', 600, 600),
    ]);
    $lastPath = $product->fresh()->image_path;

    app(DeleteProductAction::class)->execute($product->fresh());
    Storage::disk('public')->assertMissing($lastPath);
});

test('package and promotion images are stored and cleaned up with their records', function () {
    Storage::fake('public');

    $owner = User::factory()->create();
    $team = $owner->currentTeam;
    $product = catalogImageProduct($owner);

    $package = app(CreateProductPackageAction::class)->execute($team, [
        'sku' => 'IMG-PACKAGE',
        'name' => 'Paket Bergambar',
        'base_price' => 30000,
        'image' => UploadedFile::fake()->image('paket.jpg', 600, 600),
        'items' => [[
            'product_id' => $product->id,
            'quantity' => 1,
        ]],
    ]);
    $packagePath = $package->image_path;
    Storage::disk('public')->assertExists($packagePath);
    expect($package->image_url)->toBe('/storage/'.$packagePath);

    $promotion = app(CreateProductPromotionAction::class)->execute($team, [
        'name' => 'Promosi Bergambar',
        'type' => 'bxgy',
        'image' => UploadedFile::fake()->image('promosi.png', 600, 600),
        'triggers' => [[
            'product_id' => $product->id,
            'min_quantity' => 2,
        ]],
        'rewards' => [[
            'product_id' => $product->id,
            'quantity' => 1,
            'extra_charge' => 0,
        ]],
    ]);
    $promotionPath = $promotion->image_path;
    Storage::disk('public')->assertExists($promotionPath);
    expect($promotion->image_url)->toBe('/storage/'.$promotionPath);

    app(DeleteProductPackageAction::class)->execute($package);
    app(DeleteProductPromotionAction::class)->execute($promotion);

    Storage::disk('public')->assertMissing($packagePath);
    Storage::disk('public')->assertMissing($promotionPath);
});

test('catalog image requests reject unsupported files', function () {
    Storage::fake('public');

    $owner = User::factory()->create();
    $team = $owner->currentTeam;
    $product = catalogImageProduct($owner);
    $invalidFile = fn () => UploadedFile::fake()->create('dokumen.pdf', 100, 'application/pdf');

    $this->actingAs($owner)
        ->post("/{$team->slug}/products", [
            'sku' => 'INVALID-IMAGE',
            'name' => 'Produk Invalid',
            'price' => 10000,
            'stock' => 1,
            'image' => $invalidFile(),
        ])
        ->assertSessionHasErrors('image');

    $this->actingAs($owner)
        ->post("/{$team->slug}/product-packages", [
            'sku' => 'INVALID-PACKAGE-IMAGE',
            'name' => 'Paket Invalid',
            'base_price' => 10000,
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
            'image' => $invalidFile(),
        ])
        ->assertSessionHasErrors('image');

    $this->actingAs($owner)
        ->post("/{$team->slug}/product-promotions", [
            'name' => 'Promosi Invalid',
            'type' => 'bxgy',
            'triggers' => [['product_id' => $product->id, 'min_quantity' => 1]],
            'rewards' => [['product_id' => $product->id, 'quantity' => 1, 'extra_charge' => 0]],
            'image' => $invalidFile(),
        ])
        ->assertSessionHasErrors('image');
});

test('product image upload works through create and multipart update endpoints', function () {
    Storage::fake('public');

    $owner = User::factory()->create();
    $team = $owner->currentTeam;

    $this->actingAs($owner)
        ->post("/{$team->slug}/products", [
            'sku' => 'HTTP-IMAGE',
            'name' => 'Produk HTTP',
            'price' => 12000,
            'stock' => 5,
            'image' => UploadedFile::fake()->image('produk-http.jpg', 600, 600),
        ])
        ->assertSessionHasNoErrors();

    $product = Product::query()->where('sku', 'HTTP-IMAGE')->firstOrFail();
    $initialPath = $product->image_path;
    Storage::disk('public')->assertExists($initialPath);

    $this->actingAs($owner)
        ->post("/{$team->slug}/products/{$product->id}", [
            '_method' => 'put',
            'sku' => $product->sku,
            'name' => $product->name,
            'description' => '',
            'price' => $product->price,
            'cost' => '',
            'stock' => $product->stock,
            'min_stock' => $product->min_stock,
            'is_active' => true,
            'image' => UploadedFile::fake()->image('produk-http-baru.png', 600, 600),
            'remove_image' => false,
        ])
        ->assertSessionHasNoErrors();

    $replacementPath = $product->fresh()->image_path;
    expect($replacementPath)->not->toBe($initialPath);
    Storage::disk('public')->assertMissing($initialPath);
    Storage::disk('public')->assertExists($replacementPath);
});
