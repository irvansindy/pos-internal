<?php

namespace App\Http\Requests\Menu;

use Illuminate\Foundation\Http\FormRequest;

class CreateMenuRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'      => ['required', 'string', 'unique:menus,name', 'regex:/^[a-z0-9\-]+$/'],
            'label'     => ['required', 'string', 'max:255'],
            'route'     => ['nullable', 'string', 'max:255'],
            'icon'      => ['nullable', 'string', 'max:100'],
            'parent_id' => ['nullable', 'integer', 'exists:menus,id'],
            'module'    => ['nullable', 'string', 'max:100'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'      => 'Nama menu wajib diisi.',
            'name.string'        => 'Nama menu harus berupa teks.',
            'name.unique'        => 'Nama menu sudah digunakan.',
            'name.regex'         => 'Nama menu hanya boleh mengandung huruf kecil, angka, dan tanda hubung.',
            'label.required'     => 'Label menu wajib diisi.',
            'label.string'       => 'Label menu harus berupa teks.',
            'label.max'          => 'Label menu maksimal 255 karakter.',
            'route.string'       => 'Route harus berupa teks.',
            'route.max'          => 'Route maksimal 255 karakter.',
            'icon.string'        => 'Icon harus berupa teks.',
            'icon.max'           => 'Icon maksimal 100 karakter.',
            'parent_id.integer'  => 'Parent ID harus berupa angka.',
            'parent_id.exists'   => 'Menu parent tidak ditemukan.',
            'module.string'      => 'Module harus berupa teks.',
            'module.max'         => 'Module maksimal 100 karakter.',
        ];
    }
}
