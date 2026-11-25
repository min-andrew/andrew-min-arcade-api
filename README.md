# Andrew's Arcade API

The backend for Andrew's Arcade: accounts, sessions, and Battleship games.
Built with Node, Hono, and MongoDB. The game rules come from
[@min-andrew/arcade-core](https://www.npmjs.com/package/@min-andrew/arcade-core).

Only the arcade's SvelteKit server calls this API, never the browser.

## Environment

Copy `.env.example` to `.env` and set `MONGODB_URI` to your MongoDB
connection string. Never commit `.env`.

## Run it

```sh
npm install
npm run dev   # http://localhost:3000
```

## Authentication

Sign up or log in to get a `token`, then send it on every request:

```
Authorization: Bearer <token>
```

Logging out deletes the session, so the token stops working.

## Errors

Every error is JSON with one message: `{ "error": "It's not your turn" }`.

| Status | Meaning |
| --- | --- |
| 400 | The body or game id is invalid |
| 401 | Not logged in, or wrong email or password |
| 403 | Logged in, but not a player in this game |
| 404 | No such game or route |
| 409 | Clashes with the current state (email taken, game full, not your turn, square already fired at, game not in progress) |
| 500 | Something broke on the server |

## Objects

**User:** `{ id, email, name }`. The password hash is never returned.

**Board:** `{ cells, ships }`. `cells` has 100 cells, row by row, so the cell
at column `x` and row `y` is `cells[y * 10 + x]`. Each cell is
`{ ship, shot }`: `ship` is a ship's name or `null`, and `shot` is `null`,
`"hit"`, or `"miss"`. `ships` is `[{ name, length, sunk }]`.

**Game:** `{ id, status, players, turn, winner }`. `status` is `"waiting"`,
`"active"`, or `"finished"`. `turn` and `winner` are user ids or `null`. Each
player is `{ id, name, board }`.

## Endpoints

### Auth

| Method and path | Body | Success | Errors |
| --- | --- | --- | --- |
| `POST /api/auth/signup` | `{ email, password }` (password at least 8 characters) | 201 `{ user, token }` | 400, 409 email taken |
| `POST /api/auth/login` | `{ email, password }` | 200 `{ user, token }` | 400, 401 |
| `POST /api/auth/logout` | none | 200 `{ ok: true }` | 401 |
| `GET /api/auth/me` | none | 200 `{ user }` | 401 |

### Games

| Method and path | Body | Success | Errors |
| --- | --- | --- | --- |
| `GET /api/games` | none | 200 `{ open, mine }` | none |
| `POST /api/games` | none | 201 `{ game }` | 401 |
| `GET /api/games/:id` | none | 200 `{ game }` | 400, 401, 404 |
| `POST /api/games/:id/players` | none | 201 `{ game }` | 400, 401, 404, 409 |
| `POST /api/games/:id/shots` | `{ x, y }` (0 to 9) | 201 `{ shot, game }` | 400, 401, 403, 404, 409 |

- **`GET /api/games`:** `open` is the games waiting for a second player (not
  your own), and `mine` is the games you're in. Logged out, `mine` is empty.
  Neither list includes boards.
- **`POST /api/games`:** creates a game with both fleets placed at random.
  You're the first player, and the game waits for a second.
- **`GET /api/games/:id`:**
  - Players come back as `[you, opponent]`.
  - You see your own board in full. On your opponent's board you see only your
    shots and the ships you've sunk.
  - Logged out, a game that isn't finished returns 401.
  - Anyone else who isn't a player gets no boards until the game is finished.
  - Once it's finished, everyone sees both boards.
- **`POST /api/games/:id/players`:** joins a waiting game as the second
  player. The game becomes `active`, and the creator fires first. Returns 409
  if it's your own game or it already has two players.
- **`POST /api/games/:id/shots`:** fires at `(x, y)` on your opponent's board.
  - `shot` is `{ x, y, result }`, where `result` is `"hit"` or `"miss"`.
  - Returns 403 if you aren't a player. Returns 409 if the game isn't active,
    it isn't your turn, or you already fired at that square.
  - When the last ship sinks, the game is `finished` and you're the `winner`.
