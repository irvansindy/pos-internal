<?php

namespace App\Http\Requests\ProductPackage;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProductPackageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $packageId = $this->route('productPackageId');
        $teamId = $this->user()->currentTeam->id;

        return [
            'category_id' => ['nullable', 'integer', Rule::exists('product_categories', 'id')->where('team_id', $teamId)],
            'sku' => ['required', 'string', 'max:100', Rule::unique('product_packages', 'sku')->where('team_id', $teamId)->ignore($packageId)],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'remove_image' => ['sometimes', 'boolean'],
            'base_price' => ['required', 'numeric', 'min:0'],
            'is_active' => ['boolean'],

            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', Rule::exists('products', 'id')->where('team_id', $teamId)],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.note' => ['nullable', 'string', 'max:255'],

            'addon_groups' => ['nullable', 'array'],
            'addon_groups.*.name' => ['required', 'string', 'max:255'],
            'addon_groups.*.default_product_id' => ['nullable', 'integer', Rule::exists('products', 'id')->where('team_id', $teamId)],
            'addon_groups.*.is_required' => ['boolean'],
            'addon_groups.*.sort_order' => ['integer', 'min:0'],
            'addon_groups.*.options' => ['nullable', 'array'],
            'addon_groups.*.options.*.product_id' => ['required', 'integer', Rule::exists('products', 'id')->where('team_id', $teamId)],
            'addon_groups.*.options.*.extra_charge' => ['required', 'numeric', 'min:0'],
            'addon_groups.*.options.*.sort_order' => ['integer', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'sku.required' => 'SKU paket wajib diisi.',
            'sku.unique' => 'SKU paket sudah digunakan.',
            'name.required' => 'Nama paket wajib diisi.',
            'base_price.required' => 'Harga dasar paket wajib diisi.',
            'base_price.min' => 'Harga dasar tidak boleh negatif.',
            'items.required' => 'Paket harus memiliki minimal 1 item produk.',
            'items.min' => 'Paket harus memiliki minimal 1 item produk.',
            'items.*.product_id.required' => 'Produk pada item wajib dipilih.',
            'items.*.product_id.exists' => 'Produk tidak ditemukan.',
            'items.*.quantity.required' => 'Jumlah item wajib diisi.',
            'items.*.quantity.min' => 'Jumlah item minimal 1.',
            'addon_groups.*.name.required' => 'Nama grup addon wajib diisi.',
            'addon_groups.*.options.*.product_id.required' => 'Produk pada opsi addon wajib dipilih.',
            'addon_groups.*.options.*.extra_charge.required' => 'Biaya tambahan addon wajib diisi.',
            'addon_groups.*.options.*.extra_charge.min' => 'Biaya tambahan tidak boleh negatif.',
            'image.image' => 'File foto paket tidak valid.',
            'image.mimes' => 'Foto paket harus berformat JPG, PNG, atau WebP.',
            'image.max' => 'Ukuran foto paket maksimal 2 MB.',
        ];
    }
}
