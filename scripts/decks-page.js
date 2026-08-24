import { deleteDeck, getDecksWithCounts } from "./db.js";

const deckList = document.querySelector("#deck-list");
const emptyState = document.querySelector("#empty-state");
const loadingEl = document.querySelector("#decks-loading");

function pluralizeCards(count) {
  return `${count} flashcard${count === 1 ? "" : "s"}`;
}

function buildDeckCard(deck) {
  const card = document.createElement("article");
  card.className = "deck-card";
  card.tabIndex = 0;
  card.setAttribute("role", "link");
  card.setAttribute("aria-label", `Open deck ${deck.title}`);

  const deckHref = `/decks/deck?id=${deck.id}`;
  card.addEventListener("click", () => {
    window.location.href = deckHref;
  });
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      window.location.href = deckHref;
    }
  });

  const topRow = document.createElement("div");
  topRow.className = "deck-card-top";

  const deckLink = document.createElement("a");
  deckLink.className = "deck-link";
  deckLink.href = deckHref;
  deckLink.textContent = deck.title;

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "btn btn-ghost btn-small btn-danger";
  deleteButton.textContent = "Delete deck";
  deleteButton.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();

    const shouldDelete = window.confirm(`Delete deck "${deck.title}"?`);
    if (!shouldDelete) {
      return;
    }

    await deleteDeck(deck.id);
    await renderDecks();
  });

  topRow.append(deckLink, deleteButton);

  const countLine = document.createElement("p");
  countLine.className = "deck-count";
  countLine.textContent = pluralizeCards(deck.cardCount);

  card.append(topRow, countLine);
  return card;
}

async function renderDecks() {
  loadingEl.hidden = false;
  emptyState.hidden = true;
  deckList.hidden = true;

  const decks = await getDecksWithCounts();
  deckList.innerHTML = "";
  loadingEl.hidden = true;

  if (decks.length === 0) {
    emptyState.hidden = false;
    deckList.hidden = true;
    return;
  }

  emptyState.hidden = true;
  deckList.hidden = false;

  decks.forEach((deck) => {
    deckList.appendChild(buildDeckCard(deck));
  });
}

renderDecks().catch(() => {
  loadingEl.hidden = true;
  emptyState.hidden = false;
  emptyState.querySelector("p").textContent = "We could not load your decks. Please refresh and try again.";
});
