import {
  createWindow, vstack, hstack, label, button, grid,
  signal, GLib,
} from '../dist/gtk.mjs';

const symbols = ['🍎', '🍊', '🍋', '🍇', '🍓', '🍑', '🥝', '🍒'];

const cards = signal([]);
const flipped = signal([]);
const matched = signal([]);
const moves = signal(0);
const gameWon = signal(false);

function initGame() {
  const deck = [...symbols, ...symbols];
  const shuffled = deck.sort(() => Math.random() - 0.5);
  cards.value = shuffled.map((symbol, index) => ({
    id: index,
    symbol,
    flipped: false,
    matched: false,
  }));
  flipped.value = [];
  matched.value = [];
  moves.value = 0;
  gameWon.value = false;
}

function getCardDisplay(card) {
  if (flipped.value.includes(card.id) || matched.value.includes(card.id)) {
    return card.symbol;
  }
  return '?';
}

function flipCard(cardId) {
  if (flipped.value.length >= 2) return;
  if (flipped.value.includes(cardId)) return;
  if (matched.value.includes(cardId)) return;

  flipped.value = [...flipped.value, cardId];

  if (flipped.value.length === 2) {
    moves.value += 1;

    const [first, second] = flipped.value;
    const firstCard = cards.value[first];
    const secondCard = cards.value[second];

    if (firstCard.symbol === secondCard.symbol) {
      matched.value = [...matched.value, first, second];
      flipped.value = [];

      if (matched.value.length === cards.value.length) {
        gameWon.value = true;
      }
    } else {
      GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, () => {
        flipped.value = [];
        return GLib.SOURCE_REMOVE;
      });
    }
  }
}

initGame();

const { open } = createWindow({ title: 'Memory Game', width: 400, height: 450 });

open(() => vstack([
  label('Memory Game'),
  hstack([
    label(`Moves: ${moves.value}`),
    label(`Matched: ${matched.value.length / 2} / ${cards.value.length / 2}`),
  ]),
  gameWon.value
    ? vstack([
        label('You Won!'),
        label(`Completed in ${moves.value} moves`),
        button('Play Again', { onClick: initGame }),
      ])
    : vstack([
        hstack(cards.value.slice(0, 4).map(c => button(getCardDisplay(c), { onClick: () => flipCard(c.id) }))),
        hstack(cards.value.slice(4, 8).map(c => button(getCardDisplay(c), { onClick: () => flipCard(c.id) }))),
        hstack(cards.value.slice(8, 12).map(c => button(getCardDisplay(c), { onClick: () => flipCard(c.id) }))),
        hstack(cards.value.slice(12, 16).map(c => button(getCardDisplay(c), { onClick: () => flipCard(c.id) }))),
      ]),
  button('New Game', { onClick: initGame }),
]));
