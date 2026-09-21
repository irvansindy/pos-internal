<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePlanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->is_platform_admin;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100'],
            'max_stores' => ['nullable', 'integer', 'min:1', 'max:100000'],
            'max_owners' => ['nullable', 'integer', 'min:1', 'max:100000'],
            'price_monthly' => ['nullable', 'numeric', 'min:0', 'max:9999999999.99'],
            'price_yearly' => ['nullable', 'numeric', 'min:0', 'max:9999999999.99'],
            'is_active' => ['required', 'boolean'],
            'reason' => ['required', 'string', 'min:5', 'max:1000'],
        ];
    }
}
