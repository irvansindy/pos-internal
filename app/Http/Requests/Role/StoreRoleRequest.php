<?php

namespace App\Http\Requests\Role;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->canOnCurrentTeam('role.create');
    }

    public function rules(): array
    {
        $team = $this->user()->currentTeam;

        return [
            'name' => [
                'required',
                'string',
                'max:50',
                'regex:/^[a-z0-9_]+$/',
                Rule::unique('roles', 'name')
                    ->where('team_id', $team->id)
                    ->where('guard_name', 'web'),
            ],
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
            'name.required'      => 'Nama role wajib diisi.',
            'name.regex'         => 'Nama role hanya boleh huruf kecil, angka, dan underscore.',
            'name.unique'        => 'Role dengan nama ini sudah ada di tim ini.',
            'label.required'     => 'Label role wajib diisi.',
            'permissions.array'  => 'Format permission tidak valid.',
            'permissions.*.exists'  => 'Permission tidak ditemukan.',
        ];
    }
}
