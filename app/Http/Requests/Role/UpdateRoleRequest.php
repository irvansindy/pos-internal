<?php

namespace App\Http\Requests\Role;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->canOnCurrentTeam('role.update');
    }

    public function rules(): array
    {
        return [
            'label'         => ['required', 'string', 'max:100'],
            'description'   => ['nullable', 'string', 'max:255'],
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
            'label.required'       => 'Label role wajib diisi.',
            'permissions.array'    => 'Format permission tidak valid.',
            'permissions.*.exists' => 'Permission tidak ditemukan.',
        ];
    }
}
