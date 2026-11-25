import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ObjectId } from 'mongodb';
import { cellAt, createRandomBoard, isGameComplete, isValidShot, updateBoard } from '@min-andrew/arcade-core';
import { collections } from '../db.js';
import { requireUser } from '../session.js';
import { gameIdSchema, shotSchema, validate } from '../validation.js';
import { toGameSummary, toGameView } from '../views.js';

export const games = new Hono();

const sameId = (a, b) => String(a) === String(b);

async function findGame(id) {
  const { games } = await collections();
  const game = await games.findOne({ _id: new ObjectId(id) });
  if (!game) throw new HTTPException(404, { message: 'Game not found' });
  return game;
}

games.get('/', async (c) => {
  const user = c.get('user');
  const { games } = await collections();
  const noBoards = { 'players.board': 0 };
  const openFilter = user ? { status: 'waiting', 'players.0.userId': { $ne: user._id } } : { status: 'waiting' };

  const [open, mine] = await Promise.all([
    games.find(openFilter).project(noBoards).toArray(),
    user ? games.find({ 'players.userId': user._id }).project(noBoards).toArray() : [],
  ]);

  return c.json({ open: open.map(toGameSummary), mine: mine.map(toGameSummary) }, 200);
});

games.post('/', requireUser, async (c) => {
  const user = c.get('user');
  const { games } = await collections();

  const game = {
    status: 'waiting',
    players: [
      { userId: user._id, name: user.name, board: createRandomBoard() },
      { userId: null, name: null, board: createRandomBoard() },
    ],
    turn: null,
    winner: null,
  };
  const { insertedId } = await games.insertOne(game);
  game._id = insertedId;

  return c.json({ game: toGameView(game, user) }, 201);
});

games.get('/:id', validate('param', gameIdSchema), async (c) => {
  const user = c.get('user');
  const game = await findGame(c.req.valid('param').id);

  if (game.status !== 'finished' && !user) {
    throw new HTTPException(401, { message: 'Log in to view a game in progress' });
  }

  return c.json({ game: toGameView(game, user) }, 200);
});

games.post('/:id/players', requireUser, validate('param', gameIdSchema), async (c) => {
  const user = c.get('user');
  const game = await findGame(c.req.valid('param').id);

  if (sameId(game.players[0].userId, user._id)) {
    throw new HTTPException(409, { message: 'You created this game, so you are already in it' });
  }

  const { games } = await collections();
  const joined = await games.findOneAndUpdate(
    { _id: game._id, status: 'waiting' },
    {
      $set: {
        'players.1.userId': user._id,
        'players.1.name': user.name,
        status: 'active',
        turn: game.players[0].userId,
      },
    },
    { returnDocument: 'after' }
  );
  if (!joined) throw new HTTPException(409, { message: 'This game already has two players' });

  return c.json({ game: toGameView(joined, user) }, 201);
});

games.post('/:id/shots', requireUser, validate('param', gameIdSchema), validate('json', shotSchema), async (c) => {
  const user = c.get('user');
  const { x, y } = c.req.valid('json');
  const game = await findGame(c.req.valid('param').id);

  const myIndex = game.players.findIndex((player) => sameId(player.userId, user._id));
  if (myIndex === -1) throw new HTTPException(403, { message: 'Only the two players can fire in this game' });
  if (game.status !== 'active') throw new HTTPException(409, { message: 'This game is not in progress' });
  if (!sameId(game.turn, user._id)) throw new HTTPException(409, { message: "It's not your turn" });

  const theirIndex = 1 - myIndex;
  const theirBoard = game.players[theirIndex].board;
  if (!isValidShot(theirBoard, x, y)) {
    throw new HTTPException(409, { message: 'You already fired at that square' });
  }

  const board = updateBoard(theirBoard, x, y);
  const over = isGameComplete(board);

  const { games } = await collections();
  const updated = await games.findOneAndUpdate(
    { _id: game._id, turn: user._id },
    {
      $set: {
        [`players.${theirIndex}.board`]: board,
        status: over ? 'finished' : 'active',
        turn: over ? null : game.players[theirIndex].userId,
        winner: over ? user._id : null,
      },
    },
    { returnDocument: 'after' }
  );
  if (!updated) throw new HTTPException(409, { message: "It's not your turn" });

  const shot = { x, y, result: cellAt(board, x, y).shot };
  return c.json({ shot, game: toGameView(updated, user) }, 201);
});
