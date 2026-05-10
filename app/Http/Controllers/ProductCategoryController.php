<?php

namespace App\Http\Controllers;

use App\Actions\ProductActivity\RecordProductActivityLogAction;
use App\Actions\ProductCategory\CreateProductCategoryAction;
use App\Actions\ProductCategory\DeleteProductCategoryAction;
use App\Actions\ProductCategory\UpdateProductCategoryAction;
use App\Http\Requests\ProductCategory\CreateProductCategoryRequest;
use App\Http\Requests\ProductCategory\UpdateProductCategoryRequest;
use App\Models\ProductActivityLog;
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
        private RecordProductActivityLogAction $recordProductActivityLogAction,
    ) {}

    public function index(Request $request): Response
    {
        $team = $request->user()->currentTeam;
        $authUser = $request->user();

        abort_unless($team->members()->where('users.id', $authUser->id)->exists(), 403);

        setPermissionsTeamId($team->id);

        $categories = $team->productCategories()
            ->withCount('products')
            ->withCount('activityLogs')
            ->orderBy('name')
            ->paginate(15);

        $recentActivity = $team->productActivityLogs()
            ->with('user:id,name')
            ->where('subject_type', ProductCategory::class)
            ->latest()
            ->limit(10)
            ->get();

        return Inertia::render('product-categories/index', [
            'categories' => $categories,
            'recentActivity' => $recentActivity,
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

        $this->recordProductActivityLogAction->execute(
            $team,
            $authUser,
            ProductCategory::class,
            $category->id,
            $category->name,
            ProductActivityLog::ACTION_CREATED,
            $this->buildChanges([], $category->only($this->categoryActivityFields())),
            "Kategori '{$category->name}' dibuat.",
            ProductCategory::class,
            $category->id,
        );

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
        $before = $category->only($this->categoryActivityFields());

        $this->updateProductCategoryAction->execute($category, $request->validated());
        $category->refresh();

        $changes = $this->buildChanges($before, $category->only($this->categoryActivityFields()));

        if ($changes !== []) {
            $this->recordProductActivityLogAction->execute(
                $team,
                $authUser,
                ProductCategory::class,
                $category->id,
                $category->name,
                ProductActivityLog::ACTION_UPDATED,
                $changes,
                "Kategori '{$category->name}' diperbarui.",
                ProductCategory::class,
                $category->id,
            );
        }

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
        $before = $category->only($this->categoryActivityFields());

        $this->recordProductActivityLogAction->execute(
            $team,
            $authUser,
            ProductCategory::class,
            $category->id,
            $name,
            ProductActivityLog::ACTION_DELETED,
            $this->buildChanges($before, []),
            "Kategori '{$name}' dihapus.",
            ProductCategory::class,
            $category->id,
        );

        $this->deleteProductCategoryAction->execute($category);

        Inertia::flash('success', "Kategori '{$name}' berhasil dihapus.");

        return back();
    }

    public function history(Request $request): Response
    {
        $team = $request->user()->currentTeam;
        $authUser = $request->user();

        abort_unless($team->members()->where('users.id', $authUser->id)->exists(), 403);

        setPermissionsTeamId($team->id);

        $category = $this->resolveProductCategory($request);
        $activity = $category->activityLogs()
            ->with('user:id,name')
            ->latest()
            ->paginate(20);

        return Inertia::render('product-categories/history', [
            'category' => $category,
            'activity' => $activity,
            'teamSlug' => $team->slug,
            'canUpdate' => $authUser->canOnCurrentTeam('product-category.update'),
            'canDelete' => $authUser->canOnCurrentTeam('product-category.delete'),
        ]);
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

    private function categoryActivityFields(): array
    {
        return [
            'name',
            'description',
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
