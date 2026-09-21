<?php

namespace App\Http\Requests\Admin;

use App\Enums\SubscriptionStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSubscriptionStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->is_platform_admin;
    }

    public function rules(): array
    {
        return [
            'status' => ['required', Rule::enum(SubscriptionStatus::class), Rule::in([
                SubscriptionStatus::Active->value,
                SubscriptionStatus::Suspended->value,
                SubscriptionStatus::Canceled->value,
            ])],
            'reason' => ['required', 'string', 'min:5', 'max:1000'],
        ];
    }
}
