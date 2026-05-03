<?php

namespace App\Http\Requests\Role;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SyncRolePermissionsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->canOnCurrentTeam('permission.assign');
    }

    public function rules(): array
    {
        return [
            'permissions'   => ['array'],
            'permissions.*' => [
                'string',
                Rule::exists('permissions', 'name')->where('guard_name', 'web'),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'permissions.array'    => 'Format permission tidak valid.',
            'permissions.*.exists' => 'Permission tidak ditemukan.',
        ];
    }
}
