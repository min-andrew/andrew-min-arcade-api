import { hideShips } from '@min-andrew/arcade-core';

const idOf = (value) => (value ? String(value) : null);

export function toUserView(user) {
  return { id: String(user._id), email: user.email, name: user.name };
}

function playerSummary(player) {
  return { id: idOf(player.userId), name: player.name };
}

export function toGameSummary(game) {
  return {
    id: String(game._id),
    status: game.status,
    players: game.players.map(playerSummary),
    turn: idOf(game.turn),
    winner: idOf(game.winner),
  };
}

export function toGameView(game, viewer) {
  const myIndex = game.players.findIndex((player) => viewer && idOf(player.userId) === String(viewer._id));
  const isPlayer = myIndex !== -1;
  const finished = game.status === 'finished';
  const ordered = isPlayer ? [game.players[myIndex], game.players[1 - myIndex]] : game.players;

  const boardFor = (player, index) =>
    finished || (isPlayer && index === 0) ? player.board : isPlayer && player.userId ? hideShips(player.board) : null;

  return {
    ...toGameSummary(game),
    players: ordered.map((player, index) => ({ ...playerSummary(player), board: boardFor(player, index) })),
  };
}
