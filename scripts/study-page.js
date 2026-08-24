import { getDeckWithFlashcards } from "./db.js";

const sessionEl = document.querySelector("#study-session");
const emptyEl = document.querySelector("#study-empty");
const summaryEl = document.querySelector("#study-summary");
const deckTitleEl = document.querySelector("#study-deck-title");
const progressEl = document.querySelector("#study-progress");
const questionEl = document.querySelector("#study-question");
const answerEl = document.querySelector("#study-answer");
const cardButton = document.querySelector("#flashcard");
const cardInner = document.querySelector("#study-card-inner");
const actionsEl = document.querySelector("#study-actions");
const knewItBtn = document.querySelector("#knew-it");
const didNotKnowBtn = document.querySelector("#did-not-know");
const studyAgainBtn = document.querySelector("#study-again");
const summaryLineEl = document.querySelector("#summary-line");
const emptyBackLink = document.querySelector("#empty-back-link");
const topBackLink = document.querySelector("#study-back-link");
const loadingEl = document.querySelector("#study-loading");

let sourceCards = [];
let shuffledCards = [];
let currentIndex = 0;
let knownCount = 0;
let isFlipped = false;

function getDeckIdFromPath() {
  const byQuery = Number(new URLSearchParams(window.location.search).get("id"));
  return Number.isFinite(byQuery) && byQuery > 0 ? byQuery : null;
}

function shuffleCards(cards) {
  const clone = [...cards];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
}

function setFlipped(flipped) {
  isFlipped = flipped;
  cardInner.classList.toggle("is-flipped", flipped);
  actionsEl.hidden = !flipped;
}

function focusCardButton() {
  // Delay focus until after the DOM has applied hidden/display changes.
  requestAnimationFrame(() => {
    cardButton.focus();
  });
}

function renderCard() {
  const card = shuffledCards[currentIndex];
  progressEl.textContent = `Card ${currentIndex + 1} of ${shuffledCards.length}`;
  questionEl.textContent = card.question;
  answerEl.textContent = card.answer;
  setFlipped(false);
  focusCardButton();
}

function showSummary() {
  loadingEl.hidden = true;
  sessionEl.hidden = true;
  summaryEl.hidden = false;
  summaryLineEl.textContent = `You knew ${knownCount} out of ${shuffledCards.length} cards`;
}

function submitAnswer(knewIt) {
  if (!isFlipped) {
    return;
  }

  if (knewIt) {
    knownCount += 1;
  }

  currentIndex += 1;

  if (currentIndex >= shuffledCards.length) {
    showSummary();
    return;
  }

  renderCard();
}

function startSession() {
  loadingEl.hidden = true;
  shuffledCards = shuffleCards(sourceCards);
  currentIndex = 0;
  knownCount = 0;
  summaryEl.hidden = true;
  emptyEl.hidden = true;
  sessionEl.hidden = false;
  renderCard();
}

function showNoCards(deckId) {
  loadingEl.hidden = true;
  sessionEl.hidden = true;
  summaryEl.hidden = true;
  emptyEl.hidden = false;
  emptyBackLink.href = deckId ? `../index.html?id=${deckId}` : "../../index.html";
}

function wireInteractions() {
  cardButton.addEventListener("click", (event) => {
    // Keyboard activation may also dispatch click in some browsers.
    // Key handling below already flips the card, so ignore that synthetic click.
    if (event.detail === 0) {
      return;
    }
    setFlipped(!isFlipped);
  });

  cardButton.addEventListener("keydown", (event) => {
    const isFlipKey =
      event.key === "Enter" ||
      event.key === " " ||
      event.key === "Spacebar" ||
      event.code === "Enter" ||
      event.code === "NumpadEnter" ||
      event.code === "Space";

    if (!isFlipKey) {
      return;
    }

    event.preventDefault();
    setFlipped(!isFlipped);
  });

  knewItBtn.addEventListener("click", () => submitAnswer(true));
  didNotKnowBtn.addEventListener("click", () => submitAnswer(false));

  studyAgainBtn.addEventListener("click", () => {
    startSession();
  });
}

async function init() {
  wireInteractions();
  loadingEl.hidden = false;
  sessionEl.hidden = true;
  summaryEl.hidden = true;
  emptyEl.hidden = true;

  const deckId = getDeckIdFromPath();
  if (!deckId) {
    showNoCards(null);
    return;
  }

  const { deck, flashcards } = await getDeckWithFlashcards(deckId);
  if (!deck) {
    showNoCards(deckId);
    return;
  }

  topBackLink.href = `../index.html?id=${deckId}`;
  deckTitleEl.textContent = deck.title;

  sourceCards = flashcards;

  if (sourceCards.length === 0) {
    showNoCards(deckId);
    return;
  }

  startSession();
}

init().catch(() => {
  showNoCards(null);
});
