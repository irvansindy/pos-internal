<?php

namespace App\Http\Requests\Product;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreateProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'category_id' => ['nullable', 'integer', Rule::exists('product_categories', 'id')->where('team_id', $this->user()->currentTeam->id)],
            'parent_product_id' => ['nullable', 'integer', Rule::exists('products', 'id')->where('team_id', $this->user()->currentTeam->id)],
            'sku' => ['required', 'string', Rule::unique('products', 'sku')->where('team_id', $this->user()->currentTeam->id)],
            'barcode' => ['nullable', 'string', 'max:100', Rule::unique('products', 'barcode')->where('team_id', $this->user()->currentTeam->id), Rule::unique('product_units', 'barcode')->where('team_id', $this->user()->currentTeam->id)],
            'base_unit' => ['sometimes', 'required', 'string', 'max:32'],
            'name' => ['required', 'string', 'max:255'],
            'variant_name' => ['nullable', 'required_with:parent_product_id', 'string', 'max:100'],
            'description' => ['nullable', 'string'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'price' => ['required', 'numeric', 'min:0'],
            'cost' => ['nullable', 'numeric', 'min:0'],
            'stock' => ['required', 'integer', 'min:0'],
            'min_stock' => ['nullable', 'integer', 'min:0'],
            'tracks_batches' => ['boolean'],
            'tracks_serials' => ['boolean'],
            'is_active' => ['boolean'],
            'units' => ['nullable', 'array'],
            'units.*.name' => ['required', 'string', 'max:100', 'distinct'],
            'units.*.abbreviation' => ['required', 'string', 'max:32'],
            'units.*.conversion_quantity' => ['required', 'integer', 'min:2'],
            'units.*.barcode' => ['nullable', 'string', 'max:100', 'distinct', Rule::unique('products', 'barcode')->where('team_id', $this->user()->currentTeam->id), Rule::unique('product_units', 'barcode')->where('team_id', $this->user()->currentTeam->id)],
            'units.*.selling_price' => ['required', 'numeric', 'min:0'],
            'units.*.is_active' => ['boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'category_id.exists' => 'Kategori produk tidak ditemukan.',
            'sku.required' => 'SKU wajib diisi.',
            'sku.unique' => 'SKU sudah digunakan.',
            'barcode.unique' => 'Barcode sudah digunakan produk atau satuan lain.',
            'name.required' => 'Nama produk wajib diisi.',
            'name.max' => 'Nama produk maksimal 255 karakter.',
            'price.required' => 'Harga wajib diisi.',
            'price.numeric' => 'Harga harus berupa angka.',
            'price.min' => 'Harga tidak boleh kurang dari 0.',
            'cost.numeric' => 'Biaya harus berupa angka.',
            'cost.min' => 'Biaya tidak boleh kurang dari 0.',
            'stock.required' => 'Stok wajib diisi.',
            'stock.integer' => 'Stok harus berupa angka bulat.',
            'stock.min' => 'Stok tidak boleh kurang dari 0.',
            'min_stock.integer' => 'Stok minimum harus berupa angka bulat.',
            'min_stock.min' => 'Stok minimum tidak boleh kurang dari 0.',
            'image.image' => 'File foto produk tidak valid.',
            'image.mimes' => 'Foto produk harus berformat JPG, PNG, atau WebP.',
            'image.max' => 'Ukuran foto produk maksimal 2 MB.',
        ];
    }
}
