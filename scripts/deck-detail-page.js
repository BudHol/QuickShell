import { getDeckWithFlashcards } from "./db.js";

const titleEl = document.querySelector("#deck-title");
const listEl = document.querySelector("#flashcard-list");
const emptyEl = document.querySelector("#detail-empty");
const studyLink = document.querySelector("#study-link");
const editLink = document.querySelector("#edit-link");
const loadingEl = document.querySelector("#detail-loading");

function getDeckIdFromPath() {
  const byQuery = Number(new URLSearchParams(window.location.search).get("id"));
  return Number.isFinite(byQuery) && byQuery > 0 ? byQuery : null;
}

function renderNotFound() {
  loadingEl.hidden = true;
  titleEl.textContent = "Deck not found";
  listEl.innerHTML = "";
  emptyEl.hidden = false;
  emptyEl.querySelector("p").textContent = "We could not find this deck.";
  studyLink.hidden = true;
  if (editLink) {
    editLink.hidden = true;
  }
}

function cardItem(card) {
  const item = document.createElement("li");
  item.className = "detail-item";

  const question = document.createElement("p");
  question.className = "detail-question";
  question.textContent = card.question;

  const answer = document.createElement("p");
  answer.className = "detail-answer";
  answer.textContent = card.answer;

  item.append(question, answer);
  return item;
}

async function init() {
  loadingEl.hidden = false;
  emptyEl.hidden = true;
  listEl.innerHTML = "";

  const deckId = getDeckIdFromPath();

  if (!deckId) {
    renderNotFound();
    return;
  }

  const { deck, flashcards } = await getDeckWithFlashcards(deckId);

  if (!deck) {
    renderNotFound();
    return;
  }

  loadingEl.hidden = true;

  titleEl.textContent = deck.title;
  studyLink.href = `./study/index.html?id=${deckId}`;
  if (editLink) {
    editLink.href = `./edit/index.html?id=${deckId}`;
  }

  listEl.innerHTML = "";
  if (flashcards.length === 0) {
    emptyEl.hidden = false;
    emptyEl.querySelector("p").textContent = "This deck has no cards yet.";
  } else {
    emptyEl.hidden = true;
    flashcards.forEach((card) => listEl.appendChild(cardItem(card)));
  }
}

init().catch(() => {
  renderNotFound();
});
