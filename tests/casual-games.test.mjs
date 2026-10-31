import assert from 'node:assert/strict';
import { lineWinner, toggleLights, shuffledPairs } from '../js/casual-games.js?v=8.0';
for (const line of [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]) {
    const board = Array(9).fill(null);
    line.forEach(i => board[i] = '○');
    assert.equal(lineWinner(board), '○');
}
assert.equal(lineWinner(['○','×','○','○','×','×','×','○','○']), null);
const empty = Array(16).fill(false);
const corner = toggleLights(empty, 0);
assert.deepEqual(corner.map((v,i) => v ? i : -1).filter(i => i >= 0), [0,1,4]);
assert.equal(empty.some(Boolean), false, 'analysis must not mutate the input');
assert.deepEqual(toggleLights(corner, 0), empty, 'a second press reverses the move');
assert.deepEqual(toggleLights(empty, 3).map((v,i) => v ? i : -1).filter(i => i >= 0), [2,3,7], 'no wrap across board edges');
let puzzle = empty;
const moves = [0,3,4,9,15];
for (const i of moves) puzzle = toggleLights(puzzle, i);
for (const i of moves.toReversed()) puzzle = toggleLights(puzzle, i);
assert.deepEqual(puzzle, empty, 'generated puzzles can be solved by reversing generation moves');
const pairs = shuffledPairs(() => .42);
assert.equal(pairs.length, 16);
for (let i = 0; i < 8; i++) assert.equal(pairs.filter(v => v === i).length, 2);
console.log('PASS: winning lines, draw, light boundaries, reversible solvable puzzles and memory card pairs');
