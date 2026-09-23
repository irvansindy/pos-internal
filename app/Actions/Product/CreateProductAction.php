<?php

namespace App\Actions\Product;

use App\Actions\InventoryBatch\RecordInventoryBatchMovementAction;
use App\Actions\InventoryLocation\InitializeInventoryLocationAction;
use App\Models\Product;
use App\Models\Team;
use App\Support\CatalogImageStorage;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Throwable;

class CreateProductAction
{
    public function __construct(
        private SyncProductUnitsAction $syncUnits,
        private RecordInventoryBatchMovementAction $batchMovement,
        private InitializeInventoryLocationAction $initializeLocation,
    ) {}

    public function execute(Team $team, array $data): Product
    {
        if (($data['tracks_serials'] ?? false) && (int) ($data['stock'] ?? 0) > 0) {
            throw ValidationException::withMessages([
                'stock' => 'Stok awal produk berserial harus 0. Masukkan stok dan nomor serial melalui penerimaan PO.',
            ]);
        }

        $imagePath = isset($data['image'])
            ? CatalogImageStorage::store($data['image'], "catalog/teams/{$team->id}/products")
            : null;

        try {
            return DB::transaction(function () use ($team, $data, $imagePath) {
                $product = $team->products()->create([
                    'category_id' => $data['category_id'] ?? null,
                    'parent_product_id' => $data['parent_product_id'] ?? null,
                    'sku' => $data['sku'],
                    'barcode' => $data['barcode'] ?? null,
                    'base_unit' => $data['base_unit'] ?? 'pcs',
                    'name' => $data['name'],
                    'variant_name' => $data['variant_name'] ?? null,
                    'description' => $data['description'] ?? null,
                    'image_path' => $imagePath,
                    'price' => $data['price'],
                    'cost' => $data['cost'] ?? null,
                    'stock' => $data['stock'] ?? 0,
                    'min_stock' => $data['min_stock'] ?? 0,
                    'tracks_batches' => $data['tracks_batches'] ?? false,
                    'tracks_serials' => $data['tracks_serials'] ?? false,
                    'is_active' => $data['is_active'] ?? true,
                ]);

                $this->syncUnits->execute($product, $data['units'] ?? []);
                $this->batchMovement->initialize($product);
                $this->initializeLocation->execute($product);

                return $product;
            });
        } catch (Throwable $exception) {
            CatalogImageStorage::delete($imagePath);

            throw $exception;
        }
    }
}
