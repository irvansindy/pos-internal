<?php

namespace App\Http\Requests\ProductStock;

use App\Models\ProductStockMovement;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AdjustProductStockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type' => ['required', Rule::in([
                ProductStockMovement::TYPE_IN,
                ProductStockMovement::TYPE_OUT,
                ProductStockMovement::TYPE_ADJUSTMENT,
            ])],
            'quantity' => ['required_unless:type,'.ProductStockMovement::TYPE_ADJUSTMENT, 'nullable', 'integer', 'min:1'],
            'final_stock' => ['required_if:type,'.ProductStockMovement::TYPE_ADJUSTMENT, 'nullable', 'integer', 'min:0'],
            'note' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'type.required' => 'Tipe penyesuaian stok wajib dipilih.',
            'type.in' => 'Tipe penyesuaian stok tidak valid.',
            'quantity.required_unless' => 'Jumlah stok wajib diisi.',
            'quantity.integer' => 'Jumlah stok harus berupa angka bulat.',
            'quantity.min' => 'Jumlah stok minimal 1.',
            'final_stock.required_if' => 'Stok akhir wajib diisi untuk penyesuaian stok.',
            'final_stock.integer' => 'Stok akhir harus berupa angka bulat.',
            'final_stock.min' => 'Stok akhir tidak boleh kurang dari 0.',
            'note.max' => 'Catatan maksimal 1000 karakter.',
        ];
    }
}
