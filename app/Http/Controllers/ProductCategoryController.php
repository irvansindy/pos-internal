<?php

namespace App\Http\Controllers;

use App\Actions\ProductCategory\CreateProductCategoryAction;
use App\Actions\ProductCategory\DeleteProductCategoryAction;
use App\Actions\ProductCategory\UpdateProductCategoryAction;
use App\Http\Requests\ProductCategory\CreateProductCategoryRequest;
use App\Http\Requests\ProductCategory\UpdateProductCategoryRequest;
use App\Models\ProductCategory;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProductCategoryController extends Controller
{
    public function __construct(
        private CreateProductCategoryAction $createProductCategoryAction,
        private UpdateProductCategoryAction $updateProductCategoryAction,
        private DeleteProductCategoryAction $deleteProductCategoryAction,
    ) {}

    public function index(Request $request): Response
    {
        $team = $request->user()->currentTeam;
        $authUser = $request->user();

        abort_unless($team->members()->where('users.id', $authUser->id)->exists(), 403);

        setPermissionsTeamId($team->id);

        $categories = $team->productCategories()
            ->withCount('products')
            ->orderBy('name')
            ->paginate(15);

        return Inertia::render('product-categories/index', [
            'categories' => $categories,
            'teamSlug' => $team->slug,
            'canCreate' => $authUser->canOnCurrentTeam('product-category.create'),
            'canUpdate' => $authUser->canOnCurrentTeam('product-category.update'),
            'canDelete' => $authUser->canOnCurrentTeam('product-category.delete'),
        ]);
    }

    public function store(CreateProductCategoryRequest $request)
    {
        $team = $request->user()->currentTeam;
        $authUser = $request->user();

        abort_unless($team->members()->where('users.id', $authUser->id)->exists(), 403);

        setPermissionsTeamId($team->id);

        $category = $this->createProductCategoryAction->execute($team, $request->validated());

        Inertia::flash('success', "Kategori '{$category->name}' berhasil dibuat.");

        return back();
    }

    public function update(UpdateProductCategoryRequest $request)
    {
        $team = $request->user()->currentTeam;
        $authUser = $request->user();

        abort_unless($team->members()->where('users.id', $authUser->id)->exists(), 403);

        setPermissionsTeamId($team->id);

        $category = $this->resolveProductCategory($request);

        $this->updateProductCategoryAction->execute($category, $request->validated());

        Inertia::flash('success', "Kategori '{$category->name}' berhasil diperbarui.");

        return back();
    }

    public function destroy(Request $request)
    {
        $team = $request->user()->currentTeam;
        $authUser = $request->user();

        abort_unless($team->members()->where('users.id', $authUser->id)->exists(), 403);

        setPermissionsTeamId($team->id);

        $category = $this->resolveProductCategory($request);

        $name = $category->name;

        $this->deleteProductCategoryAction->execute($category);

        Inertia::flash('success', "Kategori '{$name}' berhasil dihapus.");

        return back();
    }

    private function resolveProductCategory(Request $request): ProductCategory
    {
        $team = $request->user()->currentTeam;

        abort_unless($team->members()->where('users.id', $request->user()->id)->exists(), 403);

        $category = ProductCategory::where('team_id', $team->id)
            ->where('id', $request->route('productCategoryId'))
            ->firstOrFail();

        return $category;
    }
}
