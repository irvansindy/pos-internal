<?php

namespace App\Http\Requests\Pos;

use Illuminate\Foundation\Http\FormRequest;

class ValidateVoucherRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'voucher_code' => ['required', 'string', 'max:100'],
            'subtotal' => ['required', 'numeric', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'voucher_code.required' => 'Kode voucher wajib diisi.',
            'subtotal.required' => 'Subtotal transaksi wajib diisi.',
            'subtotal.numeric' => 'Subtotal harus berupa angka.',
        ];
    }
}
