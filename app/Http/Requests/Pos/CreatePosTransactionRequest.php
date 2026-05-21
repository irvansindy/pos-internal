<?php

namespace App\Http\Requests\Pos;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreatePosTransactionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'customer_name' => ['nullable', 'string', 'max:255'],
            'voucher_code' => ['nullable', 'string', 'max:100'],
            'payment_method' => ['required', Rule::in(['cash', 'card', 'transfer', 'qris'])],
            'paid_amount' => ['required', 'numeric', 'min:0'],
            'note' => ['nullable', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.item_type' => ['nullable', Rule::in(['product', 'package', 'promotion'])],
            'items.*.item_id' => ['required_without:items.*.product_id', 'integer', 'min:1'],
            'items.*.product_id' => ['required_without:items.*.item_id', 'integer', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
        ];
    }

    public function messages(): array
    {
        return [
            'payment_method.required' => 'Metode pembayaran wajib dipilih.',
            'payment_method.in' => 'Metode pembayaran tidak valid.',
            'paid_amount.required' => 'Jumlah bayar wajib diisi.',
            'paid_amount.numeric' => 'Jumlah bayar harus berupa angka.',
            'items.required' => 'Keranjang transaksi masih kosong.',
            'items.min' => 'Keranjang transaksi masih kosong.',
            'items.*.item_type.in' => 'Jenis item transaksi tidak valid.',
            'items.*.item_id.required_without' => 'Item transaksi wajib diisi.',
            'items.*.product_id.required_without' => 'Produk transaksi wajib diisi.',
            'items.*.product_id.exists' => 'Produk transaksi tidak ditemukan.',
            'items.*.quantity.required' => 'Jumlah produk wajib diisi.',
            'items.*.quantity.integer' => 'Jumlah produk harus angka bulat.',
            'items.*.quantity.min' => 'Jumlah produk minimal 1.',
        ];
    }
}
