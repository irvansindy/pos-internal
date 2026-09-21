<?php

namespace App\Http\Requests\CashierShift;

use Illuminate\Foundation\Http\FormRequest;

class CloseCashierShiftRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'counted_amount' => ['required', 'numeric', 'min:0', 'max:9999999999999.99'],
            'closing_note' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
