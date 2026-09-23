<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class CatalogImageStorage
{
    public static function url(?string $path): ?string
    {
        return $path
            ? '/storage/'.ltrim($path, '/')
            : null;
    }

    public static function store(UploadedFile $image, string $directory): string
    {
        return $image->store($directory, 'public');
    }

    public static function delete(?string $path): void
    {
        if ($path) {
            Storage::disk('public')->delete($path);
        }
    }
}
