<?php

namespace App\Http\Controllers;

use App\Actions\ProductActivity\RecordProductActivityLogAction;
use App\Actions\ProductPackage\CreateProductPackageAction;
use App\Actions\ProductPackage\DeleteProductPackageAction;
use App\Actions\ProductPackage\UpdateProductPackageAction;
use App\Http\Requests\ProductPackage\CreateProductPackageRequest;
use App\Http\Requests\ProductPackage\UpdateProductPackageRequest;
use App\Models\ProductActivityLog;
use App\Models\ProductPackage;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProductPackageController extends Controller
{
    public function __construct(
        private readonly CreateProductPackageAction      $createAction,
        private readonly UpdateProductPackageAction      $updateAction,
        private readonly DeleteProductPackageAction      $deleteAction,
        private readonly RecordProductActivityLogAction  $recordActivity,
    ) {}

    public function index(Request $request): Response
    {
        $team     = $request->user()->currentTeam;
        $authUser = $request->user();

        abort_unless($team->members()->where('users.id', $authUser->id)->exists(), 403);
        setPermissionsTeamId($team->id);

        $packages = $team->productPackages()
            ->with(['category:id,name', 'items.product:id,name,sku', 'addonGroups.options.product:id,name'])
            ->withCount('items')
            ->orderBy('name')
            ->paginate(15);

        $recentActivity = $team->productActivityLogs()
            ->with('user:id,name')
            ->where('subject_type', ProductPackage::class)
            ->latest()
            ->limit(10)
            ->get();

        $categories = $team->productCategories()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name']);

        $products = $team->products()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'sku', 'price']);

        return Inertia::render('product-packages/index', [
            'packages'       => $packages,
            'recentActivity' => $recentActivity,
            'categories'     => $categories,
            'products'       => $products,
            'teamSlug'       => $team->slug,
            'canCreate'      => $authUser->canOnCurrentTeam('product-package.create'),
            'canUpdate'      => $authUser->canOnCurrentTeam('product-package.update'),
            'canDelete'      => $authUser->canOnCurrentTeam('product-package.delete'),
        ]);
    }

    public function store(CreateProductPackageRequest $request)
    {
        $team     = $request->user()->currentTeam;
        $authUser = $request->user();

        abort_unless($team->members()->where('users.id', $authUser->id)->exists(), 403);
        setPermissionsTeamId($team->id);

        $package = $this->createAction->execute($team, $request->validated());

        $this->recordActivity->execute(
            $team,
            $authUser,
            ProductPackage::class,
            $package->id,
            $package->name,
            ProductActivityLog::ACTION_CREATED,
            $this->buildChanges([], $package->only($this->activityFields())),
            "Paket produk '{$package->name}' dibuat.",
            ProductPackage::class,
            $package->id,
        );

        Inertia::flash('success', "Paket '{$package->name}' berhasil dibuat.");

        return back();
    }

    public function update(UpdateProductPackageRequest $request)
    {
        $team     = $request->user()->currentTeam;
        $authUser = $request->user();

        abort_unless($team->members()->where('users.id', $authUser->id)->exists(), 403);
        setPermissionsTeamId($team->id);

        $package = $this->resolvePackage($request);
        $before  = $package->only($this->activityFields());

        $this->updateAction->execute($package, $request->validated());
        $package->refresh();

        $changes = $this->buildChanges($before, $package->only($this->activityFields()));

        if ($changes !== []) {
            $this->recordActivity->execute(
                $team,
                $authUser,
                ProductPackage::class,
                $package->id,
                $package->name,
                ProductActivityLog::ACTION_UPDATED,
                $changes,
                "Paket produk '{$package->name}' diperbarui.",
                ProductPackage::class,
                $package->id,
            );
        }

        Inertia::flash('success', "Paket '{$package->name}' berhasil diperbarui.");

        return back();
    }

    public function destroy(Request $request)
    {
        $team     = $request->user()->currentTeam;
        $authUser = $request->user();

        abort_unless($team->members()->where('users.id', $authUser->id)->exists(), 403);
        setPermissionsTeamId($team->id);

        $package = $this->resolvePackage($request);
        $name    = $package->name;
        $before  = $package->only($this->activityFields());

        $this->recordActivity->execute(
            $team,
            $authUser,
            ProductPackage::class,
            $package->id,
            $name,
            ProductActivityLog::ACTION_DELETED,
            $this->buildChanges($before, []),
            "Paket produk '{$name}' dihapus.",
            ProductPackage::class,
            $package->id,
        );

        $this->deleteAction->execute($package);

        Inertia::flash('success', "Paket '{$name}' berhasil dihapus.");

        return back();
    }

    public function show(Request $request): Response
    {
        $team     = $request->user()->currentTeam;
        $authUser = $request->user();

        abort_unless($team->members()->where('users.id', $authUser->id)->exists(), 403);
        setPermissionsTeamId($team->id);

        $package = $this->resolvePackage($request)
            ->load(['category:id,name', 'items.product:id,name,sku,price', 'addonGroups.defaultProduct:id,name', 'addonGroups.options.product:id,name,price']);

        return Inertia::render('product-packages/show', [
            'package'   => $package,
            'teamSlug'  => $team->slug,
            'canUpdate' => $authUser->canOnCurrentTeam('product-package.update'),
            'canDelete' => $authUser->canOnCurrentTeam('product-package.delete'),
        ]);
    }

    public function history(Request $request): Response
    {
        $team     = $request->user()->currentTeam;
        $authUser = $request->user();

        abort_unless($team->members()->where('users.id', $authUser->id)->exists(), 403);
        setPermissionsTeamId($team->id);

        $package  = $this->resolvePackage($request);
        $activity = $package->activityLogs()
            ->with('user:id,name')
            ->latest()
            ->paginate(20);

        return Inertia::render('product-packages/history', [
            'package'   => $package,
            'activity'  => $activity,
            'teamSlug'  => $team->slug,
            'canUpdate' => $authUser->canOnCurrentTeam('product-package.update'),
            'canDelete' => $authUser->canOnCurrentTeam('product-package.delete'),
        ]);
    }

    // ── Helpers ───────────────────────────────────────────

    private function resolvePackage(Request $request): ProductPackage
    {
        $team = $request->user()->currentTeam;

        abort_unless($team->members()->where('users.id', $request->user()->id)->exists(), 403);

        return ProductPackage::where('team_id', $team->id)
            ->where('id', $request->route('productPackageId'))
            ->firstOrFail();
    }

    private function activityFields(): array
    {
        return ['category_id', 'sku', 'name', 'description', 'base_price', 'is_active'];
    }

    private function buildChanges(array $before, array $after): array
    {
        $keys = array_unique(array_merge(array_keys($before), array_keys($after)));

        return collect($keys)
            ->filter(fn (string $key) => ($before[$key] ?? null) != ($after[$key] ?? null))
            ->mapWithKeys(fn (string $key) => [
                $key => [
                    'before' => $before[$key] ?? null,
                    'after'  => $after[$key] ?? null,
                ],
            ])
            ->all();
    }
}