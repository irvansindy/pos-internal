<?php

namespace App\Http\Requests\CashierShift;

use Illuminate\Foundation\Http\FormRequest;

class OpenCashierShiftRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'opening_amount' => ['required', 'numeric', 'min:0', 'max:9999999999999.99'],
            'opening_note' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
