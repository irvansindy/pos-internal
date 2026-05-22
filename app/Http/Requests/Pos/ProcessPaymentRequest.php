<?php

namespace App\Http\Requests\Pos;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProcessPaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'payment_method' => ['required', Rule::in(['cash', 'card', 'transfer', 'qris'])],
            'paid_amount' => ['required', 'numeric', 'gt:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'payment_method.required' => 'Metode pembayaran wajib dipilih.',
            'payment_method.in' => 'Metode pembayaran tidak valid.',
            'paid_amount.required' => 'Jumlah bayar wajib diisi.',
            'paid_amount.numeric' => 'Jumlah bayar harus berupa angka.',
            'paid_amount.gt' => 'Jumlah bayar wajib lebih dari 0.',
        ];
    }
}
