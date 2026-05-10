<?php

namespace App\Http\Requests\Menu;

use Illuminate\Foundation\Http\FormRequest;

class SyncMenuRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'menu_ids' => ['nullable', 'array'],
            'menu_ids.*' => ['integer', 'exists:menus,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'menu_ids.array'     => 'Menu IDs harus berupa array.',
            'menu_ids.*.integer' => 'Setiap ID menu harus berupa angka.',
            'menu_ids.*.exists'  => 'Menu dengan ID tersebut tidak ditemukan.',
        ];
    }
}
