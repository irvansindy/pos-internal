<?php

namespace App\Http\Requests\CashierShift;

use App\Models\CashierCashMovement;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RecordCashMovementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type' => ['required', Rule::in([CashierCashMovement::TYPE_IN, CashierCashMovement::TYPE_OUT])],
            'amount' => ['required', 'numeric', 'gt:0', 'max:9999999999999.99'],
            'category' => ['required', 'string', 'max:100'],
            'note' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
