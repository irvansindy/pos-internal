<?php

namespace App\Actions\Product;

use App\Actions\InventoryBatch\RecordInventoryBatchMovementAction;
use App\Models\Product;
use App\Support\CatalogImageStorage;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Throwable;

class UpdateProductAction
{
    public function __construct(
        private SyncProductUnitsAction $syncUnits,
        private RecordInventoryBatchMovementAction $batchMovement,
    ) {}

    public function execute(Product $product, array $data): Product
    {
        $tracksSerials = (bool) ($data['tracks_serials'] ?? $product->tracks_serials);
        $targetStock = (int) ($data['stock'] ?? $product->stock);
        $inStockSerials = $product->inventorySerials()->where('status', 'in_stock')->count();

        if ($targetStock !== (int) $product->stock) {
            throw ValidationException::withMessages([
                'stock' => 'Stok tidak dapat diubah dari form produk. Gunakan Manajemen Stok, stok opname, penerimaan PO, retur, atau transfer.',
            ]);
        }

        if ($tracksSerials && $targetStock !== $inStockSerials) {
            throw ValidationException::withMessages([
                'stock' => "Stok produk berserial harus sama dengan jumlah serial tersedia ({$inStockSerials}). Gunakan penerimaan PO, retur, atau transfer untuk mengubah stok.",
            ]);
        }

        if (! $tracksSerials && $product->tracks_serials && $product->inventorySerials()->exists()) {
            throw ValidationException::withMessages([
                'tracks_serials' => 'Pelacakan serial tidak dapat dinonaktifkan karena produk sudah memiliki histori serial.',
            ]);
        }

        $oldImagePath = $product->image_path;
        $newImagePath = isset($data['image'])
            ? CatalogImageStorage::store($data['image'], "catalog/teams/{$product->team_id}/products")
            : null;
        $imagePath = $newImagePath
            ?? (($data['remove_image'] ?? false) ? null : $oldImagePath);

        try {
            DB::transaction(function () use ($product, $data, $imagePath) {
                $product->update([
                    'category_id' => array_key_exists('category_id', $data) ? $data['category_id'] : $product->category_id,
                    'parent_product_id' => array_key_exists('parent_product_id', $data) ? $data['parent_product_id'] : $product->parent_product_id,
                    'sku' => $data['sku'] ?? $product->sku,
                    'barcode' => array_key_exists('barcode', $data) ? $data['barcode'] : $product->barcode,
                    'base_unit' => $data['base_unit'] ?? $product->base_unit,
                    'name' => $data['name'] ?? $product->name,
                    'variant_name' => array_key_exists('variant_name', $data) ? $data['variant_name'] : $product->variant_name,
                    'description' => $data['description'] ?? $product->description,
                    'image_path' => $imagePath,
                    'price' => $data['price'] ?? $product->price,
                    'cost' => $data['cost'] ?? $product->cost,
                    'stock' => $data['stock'] ?? $product->stock,
                    'min_stock' => $data['min_stock'] ?? $product->min_stock,
                    'tracks_batches' => $data['tracks_batches'] ?? $product->tracks_batches,
                    'tracks_serials' => $data['tracks_serials'] ?? $product->tracks_serials,
                    'is_active' => $data['is_active'] ?? $product->is_active,
                ]);
                if (array_key_exists('units', $data)) {
                    $this->syncUnits->execute($product, $data['units']);
                }
                $this->batchMovement->initialize($product);
            });
        } catch (Throwable $exception) {
            CatalogImageStorage::delete($newImagePath);

            throw $exception;
        }

        if ($imagePath !== $oldImagePath) {
            CatalogImageStorage::delete($oldImagePath);
        }

        return $product;
    }
}
