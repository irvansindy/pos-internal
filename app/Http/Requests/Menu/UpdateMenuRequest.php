<?php

namespace App\Http\Requests\Menu;

use Illuminate\Foundation\Http\FormRequest;

class UpdateMenuRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'label'     => ['required', 'string', 'max:255'],
            'route'     => ['nullable', 'string', 'max:255'],
            'icon'      => ['nullable', 'string', 'max:100'],
            'parent_id' => ['nullable', 'integer', 'exists:menus,id'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'label.required'     => 'Label menu wajib diisi.',
            'label.string'       => 'Label menu harus berupa teks.',
            'label.max'          => 'Label menu maksimal 255 karakter.',
            'route.string'       => 'Route harus berupa teks.',
            'route.max'          => 'Route maksimal 255 karakter.',
            'icon.string'        => 'Icon harus berupa teks.',
            'icon.max'           => 'Icon maksimal 100 karakter.',
            'parent_id.integer'  => 'Parent ID harus berupa angka.',
            'parent_id.exists'   => 'Menu parent tidak ditemukan.',
            'sort_order.integer' => 'Sort order harus berupa angka.',
            'sort_order.min'     => 'Sort order minimal 0.',
            'is_active.boolean'  => 'Status aktif harus berupa boolean.',
        ];
    }
}
