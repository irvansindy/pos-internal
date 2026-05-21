<?php

namespace App\Http\Controllers;

use App\Actions\ProductActivity\RecordProductActivityLogAction;
use App\Actions\ProductPromotion\CreateProductPromotionAction;
use App\Actions\ProductPromotion\DeleteProductPromotionAction;
use App\Actions\ProductPromotion\UpdateProductPromotionAction;
use App\Http\Requests\ProductPromotion\CreateProductPromotionRequest;
use App\Http\Requests\ProductPromotion\UpdateProductPromotionRequest;
use App\Models\ProductActivityLog;
use App\Models\ProductPromotion;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProductPromotionController extends Controller
{
    public function __construct(
        private readonly CreateProductPromotionAction   $createAction,
        private readonly UpdateProductPromotionAction   $updateAction,
        private readonly DeleteProductPromotionAction   $deleteAction,
        private readonly RecordProductActivityLogAction $recordActivity,
    ) {}

    public function index(Request $request): Response
    {
        $team     = $request->user()->currentTeam;
        $authUser = $request->user();

        abort_unless($team->members()->where('users.id', $authUser->id)->exists(), 403);
        setPermissionsTeamId($team->id);

        $promotions = $team->productPromotions()
            ->with([
                'triggers.product:id,name,sku',
                'rewards.product:id,name,sku',
            ])
            ->withCount(['triggers', 'rewards'])
            ->orderByDesc('is_active')
            ->orderBy('name')
            ->paginate(15);

        $recentActivity = $team->productActivityLogs()
            ->with('user:id,name')
            ->where('subject_type', ProductPromotion::class)
            ->latest()
            ->limit(10)
            ->get();

        $products = $team->products()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'sku', 'price']);

        return Inertia::render('product-promotions/index', [
            'promotions'     => $promotions,
            'recentActivity' => $recentActivity,
            'products'       => $products,
            'teamSlug'       => $team->slug,
            'canCreate'      => $authUser->canOnCurrentTeam('product-promotion.create'),
            'canUpdate'      => $authUser->canOnCurrentTeam('product-promotion.update'),
            'canDelete'      => $authUser->canOnCurrentTeam('product-promotion.delete'),
        ]);
    }

    public function store(CreateProductPromotionRequest $request)
    {
        $team     = $request->user()->currentTeam;
        $authUser = $request->user();

        abort_unless($team->members()->where('users.id', $authUser->id)->exists(), 403);
        setPermissionsTeamId($team->id);

        $promotion = $this->createAction->execute($team, $request->validated());

        $this->recordActivity->execute(
            team:          $team,
            user:          $authUser,
            subjectType:   ProductPromotion::class,
            subjectId:     $promotion->id,
            subjectName:   $promotion->name,
            action:        ProductActivityLog::ACTION_CREATED,
            changes:       $this->buildChanges([], $promotion->only($this->activityFields())),
            note:          "Promosi '{$promotion->name}' dibuat.",
            referenceType: ProductPromotion::class,
            referenceId:   $promotion->id,
        );

        Inertia::flash('success', "Promosi '{$promotion->name}' berhasil dibuat.");

        return back();
    }

    public function update(UpdateProductPromotionRequest $request)
    {
        $team     = $request->user()->currentTeam;
        $authUser = $request->user();

        abort_unless($team->members()->where('users.id', $authUser->id)->exists(), 403);
        setPermissionsTeamId($team->id);

        $promotion = $this->resolvePromotion($request);
        $before    = $promotion->only($this->activityFields());

        $this->updateAction->execute($promotion, $request->validated());
        $promotion->refresh();

        $changes = $this->buildChanges($before, $promotion->only($this->activityFields()));

        if ($changes !== []) {
            $this->recordActivity->execute(
                team:          $team,
                user:          $authUser,
                subjectType:   ProductPromotion::class,
                subjectId:     $promotion->id,
                subjectName:   $promotion->name,
                action:        ProductActivityLog::ACTION_UPDATED,
                changes:       $changes,
                note:          "Promosi '{$promotion->name}' diperbarui.",
                referenceType: ProductPromotion::class,
                referenceId:   $promotion->id,
            );
        }

        Inertia::flash('success', "Promosi '{$promotion->name}' berhasil diperbarui.");

        return back();
    }

    public function destroy(Request $request)
    {
        $team     = $request->user()->currentTeam;
        $authUser = $request->user();

        abort_unless($team->members()->where('users.id', $authUser->id)->exists(), 403);
        setPermissionsTeamId($team->id);

        $promotion = $this->resolvePromotion($request);
        $name      = $promotion->name;
        $before    = $promotion->only($this->activityFields());

        $this->recordActivity->execute(
            team:          $team,
            user:          $authUser,
            subjectType:   ProductPromotion::class,
            subjectId:     $promotion->id,
            subjectName:   $name,
            action:        ProductActivityLog::ACTION_DELETED,
            changes:       $this->buildChanges($before, []),
            note:          "Promosi '{$name}' dihapus.",
            referenceType: ProductPromotion::class,
            referenceId:   $promotion->id,
        );

        $this->deleteAction->execute($promotion);

        Inertia::flash('success', "Promosi '{$name}' berhasil dihapus.");

        return back();
    }

    public function history(Request $request): Response
    {
        $team     = $request->user()->currentTeam;
        $authUser = $request->user();

        abort_unless($team->members()->where('users.id', $authUser->id)->exists(), 403);
        setPermissionsTeamId($team->id);

        $promotion = $this->resolvePromotion($request);
        $activity  = $promotion->activityLogs()
            ->with('user:id,name')
            ->latest()
            ->paginate(20);

        return Inertia::render('product-promotions/history', [
            'promotion' => $promotion,
            'activity'  => $activity,
            'teamSlug'  => $team->slug,
            'canUpdate' => $authUser->canOnCurrentTeam('product-promotion.update'),
            'canDelete' => $authUser->canOnCurrentTeam('product-promotion.delete'),
        ]);
    }

    // ── Private helpers ───────────────────────────────────

    private function resolvePromotion(Request $request): ProductPromotion
    {
        $team = $request->user()->currentTeam;

        abort_unless($team->members()->where('users.id', $request->user()->id)->exists(), 403);

        return ProductPromotion::where('team_id', $team->id)
            ->where('id', $request->route('productPromotionId'))
            ->firstOrFail();
    }

    private function activityFields(): array
    {
        return ['name', 'description', 'type', 'is_active', 'starts_at', 'ends_at'];
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