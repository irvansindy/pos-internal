<?php

namespace App\Http\Requests\ProductPromotion;

use App\Models\ProductPromotion;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProductPromotionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'                        => ['required', 'string', 'max:255'],
            'description'                 => ['nullable', 'string'],
            'type'                        => ['required', Rule::in([ProductPromotion::TYPE_BXGY])],
            'is_active'                   => ['boolean'],
            'starts_at'                   => ['nullable', 'date', 'before_or_equal:ends_at'],
            'ends_at'                     => ['nullable', 'date', 'after_or_equal:starts_at'],

            'triggers'                    => ['required', 'array', 'min:1'],
            'triggers.*.product_id'       => ['required', 'integer', 'exists:products,id'],
            'triggers.*.min_quantity'     => ['required', 'integer', 'min:1'],

            'rewards'                     => ['required', 'array', 'min:1'],
            'rewards.*.product_id'        => ['required', 'integer', 'exists:products,id'],
            'rewards.*.quantity'          => ['required', 'integer', 'min:1'],
            'rewards.*.extra_charge'      => ['required', 'numeric', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'                    => 'Nama promosi wajib diisi.',
            'type.required'                    => 'Tipe promosi wajib dipilih.',
            'type.in'                          => 'Tipe promosi tidak valid.',
            'starts_at.before_or_equal'        => 'Tanggal mulai harus sebelum atau sama dengan tanggal berakhir.',
            'ends_at.after_or_equal'           => 'Tanggal berakhir harus setelah atau sama dengan tanggal mulai.',
            'triggers.required'                => 'Promosi harus memiliki minimal 1 syarat pembelian.',
            'triggers.min'                     => 'Promosi harus memiliki minimal 1 syarat pembelian.',
            'triggers.*.product_id.required'   => 'Produk syarat wajib dipilih.',
            'triggers.*.product_id.exists'     => 'Produk syarat tidak ditemukan.',
            'triggers.*.min_quantity.required' => 'Minimal jumlah beli wajib diisi.',
            'triggers.*.min_quantity.min'      => 'Minimal jumlah beli harus minimal 1.',
            'rewards.required'                 => 'Promosi harus memiliki minimal 1 hadiah.',
            'rewards.min'                      => 'Promosi harus memiliki minimal 1 hadiah.',
            'rewards.*.product_id.required'    => 'Produk hadiah wajib dipilih.',
            'rewards.*.product_id.exists'      => 'Produk hadiah tidak ditemukan.',
            'rewards.*.quantity.required'      => 'Jumlah hadiah wajib diisi.',
            'rewards.*.quantity.min'           => 'Jumlah hadiah minimal 1.',
            'rewards.*.extra_charge.required'  => 'Biaya tambahan hadiah wajib diisi (0 = gratis).',
            'rewards.*.extra_charge.min'       => 'Biaya tambahan tidak boleh negatif.',
        ];
    }
}