<?php

namespace App\Http\Controllers;

use App\Actions\ProductActivity\RecordProductActivityLogAction;
use App\Actions\Product\CreateProductAction;
use App\Actions\Product\DeleteProductAction;
use App\Actions\Product\UpdateProductAction;
use App\Http\Requests\Product\CreateProductRequest;
use App\Http\Requests\Product\UpdateProductRequest;
use App\Models\Product;
use App\Models\ProductActivityLog;
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
        private RecordProductActivityLogAction $recordProductActivityLogAction,
    ) {}

    public function index(Request $request): Response
    {
        $team = $request->user()->currentTeam;
        $authUser = $request->user();

        abort_unless($team->members()->where('users.id', $authUser->id)->exists(), 403);

        setPermissionsTeamId($team->id);

        $products = $team->products()
            ->with(['category:id,name'])
            ->withCount('activityLogs')
            ->orderBy('name')
            ->paginate(15);

        $recentActivity = $team->productActivityLogs()
            ->with('user:id,name')
            ->where('subject_type', Product::class)
            ->latest()
            ->limit(10)
            ->get();

        $categories = $team->productCategories()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('products/index', [
            'products' => $products,
            'recentActivity' => $recentActivity,
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

        $this->recordProductActivityLogAction->execute(
            $team,
            $authUser,
            Product::class,
            $product->id,
            $product->name,
            ProductActivityLog::ACTION_CREATED,
            $this->buildChanges([], $product->only($this->productActivityFields())),
            "Produk '{$product->name}' dibuat.",
            Product::class,
            $product->id,
        );

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
        $before = $product->only($this->productActivityFields());

        $this->updateProductAction->execute($product, $request->validated());
        $product->refresh();

        $changes = $this->buildChanges($before, $product->only($this->productActivityFields()));

        if ($changes !== []) {
            $this->recordProductActivityLogAction->execute(
                $team,
                $authUser,
                Product::class,
                $product->id,
                $product->name,
                ProductActivityLog::ACTION_UPDATED,
                $changes,
                "Produk '{$product->name}' diperbarui.",
                Product::class,
                $product->id,
            );
        }

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
        $before = $product->only($this->productActivityFields());

        $this->recordProductActivityLogAction->execute(
            $team,
            $authUser,
            Product::class,
            $product->id,
            $name,
            ProductActivityLog::ACTION_DELETED,
            $this->buildChanges($before, []),
            "Produk '{$name}' dihapus.",
            Product::class,
            $product->id,
        );

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

    public function history(Request $request): Response
    {
        $team = $request->user()->currentTeam;
        $authUser = $request->user();

        abort_unless($team->members()->where('users.id', $authUser->id)->exists(), 403);

        setPermissionsTeamId($team->id);

        $product = $this->resolveProduct($request)
            ->load('category:id,name');
        $activity = $product->activityLogs()
            ->with('user:id,name')
            ->latest()
            ->paginate(20);

        return Inertia::render('products/history', [
            'product' => $product,
            'activity' => $activity,
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

    private function productActivityFields(): array
    {
        return [
            'category_id',
            'sku',
            'name',
            'description',
            'price',
            'cost',
            'stock',
            'min_stock',
            'is_active',
        ];
    }

    private function buildChanges(array $before, array $after): array
    {
        $keys = array_unique(array_merge(array_keys($before), array_keys($after)));

        return collect($keys)
            ->filter(fn (string $key) => ($before[$key] ?? null) != ($after[$key] ?? null))
            ->mapWithKeys(fn (string $key) => [
                $key => [
                    'before' => $before[$key] ?? null,
                    'after' => $after[$key] ?? null,
                ],
            ])
            ->all();
    }
}
