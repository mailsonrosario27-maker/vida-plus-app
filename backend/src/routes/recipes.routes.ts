import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

const listQuerySchema = z.object({
  category: z.enum(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'DESSERT', 'DRINK', 'TEA']).optional(),
  period: z.enum(['MORNING', 'AFTERNOON', 'NIGHT', 'ANY']).optional(),
  tag: z.string().optional(),
});

// Listagem pública (não exige login) para permitir preview antes do cadastro.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { category, period, tag } = listQuerySchema.parse(req.query);
    const recipes = await prisma.recipe.findMany({
      where: {
        ...(category ? { category } : {}),
        ...(period ? { period } : {}),
        ...(tag ? { tags: { has: tag } } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(recipes);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const recipe = await prisma.recipe.findUnique({ where: { id: req.params.id } });
    if (!recipe) return res.status(404).json({ error: 'Receita não encontrada.' });
    res.json(recipe);
  })
);

router.get(
  '/:id/alternatives',
  asyncHandler(async (req, res) => {
    const recipe = await prisma.recipe.findUnique({ where: { id: req.params.id } });
    if (!recipe) return res.status(404).json({ error: 'Receita não encontrada.' });
    const alternatives = await prisma.recipe.findMany({
      where: { category: recipe.category, id: { not: recipe.id } },
      take: 5,
    });
    res.json(alternatives);
  })
);

router.use(requireAuth);

router.post(
  '/:id/favorite',
  asyncHandler(async (req, res) => {
    const favorite = await prisma.favoriteRecipe.upsert({
      where: { userId_recipeId: { userId: req.auth!.userId, recipeId: req.params.id } },
      create: { userId: req.auth!.userId, recipeId: req.params.id },
      update: {},
    });
    res.status(201).json(favorite);
  })
);

router.delete(
  '/:id/favorite',
  asyncHandler(async (req, res) => {
    await prisma.favoriteRecipe
      .delete({ where: { userId_recipeId: { userId: req.auth!.userId, recipeId: req.params.id } } })
      .catch(() => null);
    res.status(204).send();
  })
);

router.get(
  '/me/favorites',
  asyncHandler(async (req, res) => {
    const favorites = await prisma.favoriteRecipe.findMany({
      where: { userId: req.auth!.userId },
      include: { recipe: true },
    });
    res.json(favorites.map((f) => f.recipe));
  })
);

// Lista de compras automática — gerada a partir dos ingredientes das
// receitas que o usuário adicionou ao seu dia/favoritos.
const shoppingFromRecipesSchema = z.object({ recipeIds: z.array(z.string()).min(1) });

router.post(
  '/shopping-list/generate',
  asyncHandler(async (req, res) => {
    const { recipeIds } = shoppingFromRecipesSchema.parse(req.body);
    const recipes = await prisma.recipe.findMany({ where: { id: { in: recipeIds } } });

    const items = recipes.flatMap((recipe) => {
      const ingredients = (recipe.ingredients as { name: string; quantity?: string }[]) || [];
      return ingredients.map((ing) => ({
        userId: req.auth!.userId,
        name: ing.name,
        quantity: ing.quantity || null,
        sourceRecipeId: recipe.id,
      }));
    });

    await prisma.shoppingListItem.createMany({ data: items });
    const list = await prisma.shoppingListItem.findMany({
      where: { userId: req.auth!.userId, checked: false },
      orderBy: { createdAt: 'desc' },
    });
    res.status(201).json(list);
  })
);

router.get(
  '/shopping-list/mine',
  asyncHandler(async (req, res) => {
    const list = await prisma.shoppingListItem.findMany({
      where: { userId: req.auth!.userId },
      orderBy: [{ checked: 'asc' }, { createdAt: 'desc' }],
    });
    res.json(list);
  })
);

router.patch(
  '/shopping-list/:itemId',
  asyncHandler(async (req, res) => {
    const checked = Boolean(req.body.checked);
    const item = await prisma.shoppingListItem.updateMany({
      where: { id: req.params.itemId, userId: req.auth!.userId },
      data: { checked },
    });
    res.json(item);
  })
);

router.delete(
  '/shopping-list/:itemId',
  asyncHandler(async (req, res) => {
    await prisma.shoppingListItem.deleteMany({ where: { id: req.params.itemId, userId: req.auth!.userId } });
    res.status(204).send();
  })
);

export default router;
