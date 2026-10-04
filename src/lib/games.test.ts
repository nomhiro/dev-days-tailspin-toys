import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../../db/test-helpers';
import { categories, publishers, games } from '../../db/schema';
import type { Database } from './db';
import {
    getAllGames,
    getAllGameIds,
    getGameById,
    getGamesByFilters,
} from './games';

async function seedGames(db: Database, count: number): Promise<void> {
    const [category] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'cat' })
        .returning({ id: categories.id });
    const [publisher] = await db
        .insert(publishers)
        .values({ name: 'Pub One', description: 'pub' })
        .returning({ id: publishers.id });

    // Insert titles in reverse-alphabetical order to prove ordering is applied.
    for (let i = count; i >= 1; i--) {
        await db.insert(games).values({
            title: `Game ${String(i).padStart(2, '0')}`,
            description: `Description ${i}`,
            starRating: 4.2,
            categoryId: category.id,
            publisherId: publisher.id,
        });
    }
}

async function seedFilterGames(db: Database): Promise<{
    strategyId: number;
    puzzleId: number;
    publisherOneId: number;
    publisherTwoId: number;
}> {
    const [strategy] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'strategy' })
        .returning({ id: categories.id });
    const [puzzle] = await db
        .insert(categories)
        .values({ name: 'Puzzle', description: 'puzzle' })
        .returning({ id: categories.id });
    const [publisherOne] = await db
        .insert(publishers)
        .values({ name: 'Publisher One', description: 'publisher one' })
        .returning({ id: publishers.id });
    const [publisherTwo] = await db
        .insert(publishers)
        .values({ name: 'Publisher Two', description: 'publisher two' })
        .returning({ id: publishers.id });

    await db.insert(games).values([
        {
            title: 'Strategy One',
            description: 'Strategy game',
            categoryId: strategy.id,
            publisherId: publisherOne.id,
        },
        {
            title: 'Puzzle One',
            description: 'Puzzle game',
            categoryId: puzzle.id,
            publisherId: publisherOne.id,
        },
        {
            title: 'Strategy Two',
            description: 'Another strategy game',
            categoryId: strategy.id,
            publisherId: publisherTwo.id,
        },
    ]);

    return {
        strategyId: strategy.id,
        puzzleId: puzzle.id,
        publisherOneId: publisherOne.id,
        publisherTwoId: publisherTwo.id,
    };
}

describe('games data-access helpers', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns all games ordered by title', async () => {
        await seedGames(db, 3);
        const all = await getAllGames(db);
        expect(all.map((g) => g.title)).toEqual(['Game 01', 'Game 02', 'Game 03']);
        expect(all[0].category).toEqual({ id: expect.any(Number), name: 'Strategy' });
        expect(all[0].publisher).toEqual({ id: expect.any(Number), name: 'Pub One' });
    });

    it('returns all game ids ordered by title', async () => {
        await seedGames(db, 3);
        const ids = await getAllGameIds(db);
        const all = await getAllGames(db);
        expect(ids).toEqual(all.map((g) => g.id));
    });

    it('fetches a single game by id', async () => {
        await seedGames(db, 2);
        const ids = await getAllGameIds(db);
        const game = await getGameById(db, ids[0]);
        expect(game?.title).toBe('Game 01');
    });

    it('returns null for a non-existent game', async () => {
        await seedGames(db, 2);
        expect(await getGameById(db, 99999)).toBeNull();
    });

    it('filters by any selected category and preserves title ordering', async () => {
        const { strategyId, puzzleId } = await seedFilterGames(db);

        const filtered = await getGamesByFilters(db, {
            categoryIds: [strategyId, puzzleId],
        });

        expect(filtered.map((game) => game.title)).toEqual(['Puzzle One', 'Strategy One', 'Strategy Two']);
    });

    it('filters by publisher', async () => {
        const { publisherOneId } = await seedFilterGames(db);

        const filtered = await getGamesByFilters(db, { publisherId: publisherOneId });

        expect(filtered.map((game) => game.title)).toEqual(['Puzzle One', 'Strategy One']);
    });

    it('combines category and publisher filters', async () => {
        const { strategyId, publisherOneId } = await seedFilterGames(db);

        const filtered = await getGamesByFilters(db, {
            categoryIds: [strategyId],
            publisherId: publisherOneId,
        });

        expect(filtered.map((game) => game.title)).toEqual(['Strategy One']);
    });

    it('returns all games when no filters are selected', async () => {
        await seedGames(db, 2);

        const filtered = await getGamesByFilters(db, { categoryIds: [], publisherId: undefined });

        expect(filtered.map((game) => game.title)).toEqual(['Game 01', 'Game 02']);
    });
});
