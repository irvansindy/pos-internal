<?php

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->canOnCurrentTeam('user.update');
    }

    public function rules(): array
    {
        return [
            'name'      => ['required', 'string', 'max:255'],
            'team_role' => ['required', 'string', 'in:admin,member'],
            'role'      => ['nullable', 'string', 'exists:roles,name'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'      => 'Nama wajib diisi.',
            'team_role.required' => 'Team role wajib dipilih.',
            'team_role.in'       => 'Team role tidak valid.',
            'role.exists'        => 'Role tidak ditemukan.',
        ];
    }
}