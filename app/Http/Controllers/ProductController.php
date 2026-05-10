<?php

namespace App\Http\Controllers;

use App\Actions\Product\CreateProductAction;
use App\Actions\Product\DeleteProductAction;
use App\Actions\Product\UpdateProductAction;
use App\Http\Requests\Product\CreateProductRequest;
use App\Http\Requests\Product\UpdateProductRequest;
use App\Models\Product;
use App\Models\ProductCategory;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function __construct(
        private CreateProductAction $createProductAction,
        private UpdateProductAction $updateProductAction,
        private DeleteProductAction $deleteProductAction,
    ) {}

    public function index(Request $request): Response
    {
        $team = $request->user()->currentTeam;
        $authUser = $request->user();

        abort_unless($team->members()->where('users.id', $authUser->id)->exists(), 403);

        setPermissionsTeamId($team->id);

        $products = $team->products()
            ->with(['category:id,name'])
            ->orderBy('name')
            ->paginate(15);

        $categories = $team->productCategories()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('products/index', [
            'products' => $products,
            'categories' => $categories,
            'teamSlug' => $team->slug,
            'canCreate' => $authUser->canOnCurrentTeam('product.create'),
            'canUpdate' => $authUser->canOnCurrentTeam('product.update'),
            'canDelete' => $authUser->canOnCurrentTeam('product.delete'),
        ]);
    }

    public function create(Request $request): Response
    {
        $team = $request->user()->currentTeam;
        $authUser = $request->user();

        abort_unless($team->members()->where('users.id', $authUser->id)->exists(), 403);

        setPermissionsTeamId($team->id);

        $categories = $team->productCategories()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('products/create', [
            'categories' => $categories,
            'teamSlug' => $team->slug,
        ]);
    }

    public function store(CreateProductRequest $request)
    {
        $team = $request->user()->currentTeam;
        $authUser = $request->user();

        abort_unless($team->members()->where('users.id', $authUser->id)->exists(), 403);

        setPermissionsTeamId($team->id);

        $product = $this->createProductAction->execute($team, $request->validated());

        Inertia::flash('success', "Produk '{$product->name}' berhasil dibuat.");

        return back();
    }

    public function edit(Request $request): Response
    {
        $team = $request->user()->currentTeam;
        $authUser = $request->user();

        abort_unless($team->members()->where('users.id', $authUser->id)->exists(), 403);

        setPermissionsTeamId($team->id);

        $product = $this->resolveProduct($request);

        $categories = $team->productCategories()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('products/edit', [
            'product' => $product,
            'categories' => $categories,
            'teamSlug' => $team->slug,
        ]);
    }

    public function update(UpdateProductRequest $request)
    {
        $team = $request->user()->currentTeam;
        $authUser = $request->user();

        abort_unless($team->members()->where('users.id', $authUser->id)->exists(), 403);

        setPermissionsTeamId($team->id);

        $product = $this->resolveProduct($request);

        $this->updateProductAction->execute($product, $request->validated());

        Inertia::flash('success', "Produk '{$product->name}' berhasil diperbarui.");

        return back();
    }

    public function destroy(Request $request)
    {
        $team = $request->user()->currentTeam;
        $authUser = $request->user();

        abort_unless($team->members()->where('users.id', $authUser->id)->exists(), 403);

        setPermissionsTeamId($team->id);

        $product = $this->resolveProduct($request);

        $name = $product->name;

        $this->deleteProductAction->execute($product);

        Inertia::flash('success', "Produk '{$name}' berhasil dihapus.");

        return back();
    }

    public function show(Request $request): Response
    {
        $team = $request->user()->currentTeam;
        $authUser = $request->user();

        abort_unless($team->members()->where('users.id', $authUser->id)->exists(), 403);

        setPermissionsTeamId($team->id);

        $product = $this->resolveProduct($request)
            ->load('category');

        return Inertia::render('products/show', [
            'product' => $product,
            'teamSlug' => $team->slug,
            'canUpdate' => $authUser->canOnCurrentTeam('product.update'),
            'canDelete' => $authUser->canOnCurrentTeam('product.delete'),
        ]);
    }

    private function resolveProduct(Request $request): Product
    {
        $team = $request->user()->currentTeam;

        abort_unless($team->members()->where('users.id', $request->user()->id)->exists(), 403);

        $product = Product::where('team_id', $team->id)
            ->where('id', $request->route('productId'))
            ->firstOrFail();

        return $product;
    }
}
