import { getDeckWithFlashcards, updateDeckWithFlashcards } from "./db.js";

const form = document.querySelector("#edit-deck-form");
const titleInput = document.querySelector("#deck-title");
const rowContainer = document.querySelector("#flashcard-rows");
const addRowButton = document.querySelector("#add-card");
const errorBox = document.querySelector("#form-error");
const cancelLink = document.querySelector("#cancel-link");
const loadingEl = document.querySelector("#edit-loading");

function getDeckId() {
  const byQuery = Number(new URLSearchParams(window.location.search).get("id"));
  if (Number.isFinite(byQuery) && byQuery > 0) {
    return byQuery;
  }
  return null;
}

function createRow(questionValue = "", answerValue = "") {
  const row = document.createElement("div");
  row.className = "flashcard-row";

  const questionInput = document.createElement("input");
  questionInput.type = "text";
  questionInput.placeholder = "Question";
  questionInput.className = "text-input";
  questionInput.value = questionValue;
  questionInput.setAttribute("aria-label", "Question");

  const answerInput = document.createElement("input");
  answerInput.type = "text";
  answerInput.placeholder = "Answer";
  answerInput.className = "text-input";
  answerInput.value = answerValue;
  answerInput.setAttribute("aria-label", "Answer");

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "btn btn-ghost btn-small";
  removeButton.textContent = "Remove";
  removeButton.addEventListener("click", () => {
    row.remove();
  });

  row.append(questionInput, answerInput, removeButton);
  return row;
}

function getFilledFlashcards() {
  const rows = Array.from(rowContainer.querySelectorAll(".flashcard-row"));
  return rows
    .map((row) => {
      const inputs = row.querySelectorAll("input");
      return {
        question: (inputs[0]?.value || "").trim(),
        answer: (inputs[1]?.value || "").trim(),
      };
    })
    .filter((card) => card.question && card.answer);
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
}

function clearError() {
  errorBox.textContent = "";
  errorBox.hidden = true;
}

function renderNotFound() {
  loadingEl.hidden = true;
  form.hidden = true;
  showError("We could not find that deck.");
  errorBox.hidden = false;
}

async function initializeForm(deckId) {
  loadingEl.hidden = false;
  form.hidden = true;

  const { deck, flashcards } = await getDeckWithFlashcards(deckId);

  if (!deck) {
    renderNotFound();
    return false;
  }

  titleInput.value = deck.title;
  cancelLink.href = `/decks/deck?id=${deckId}`;

  rowContainer.innerHTML = "";
  if (flashcards.length === 0) {
    for (let i = 0; i < 3; i += 1) {
      rowContainer.appendChild(createRow());
    }
  } else {
    flashcards.forEach((card) => {
      rowContainer.appendChild(createRow(card.question, card.answer));
    });
  }

  loadingEl.hidden = true;
  form.hidden = false;

  return true;
}

addRowButton.addEventListener("click", () => {
  rowContainer.appendChild(createRow());
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError();

  const deckId = getDeckId();
  if (!deckId) {
    showError("Invalid deck id.");
    return;
  }

  const title = titleInput.value.trim();
  const flashcards = getFilledFlashcards();

  if (!title) {
    showError("Please add a deck title before saving.");
    return;
  }

  if (flashcards.length === 0) {
    showError("Please fill in at least one card with both a question and an answer.");
    return;
  }

  const saveButton = form.querySelector("button[type='submit']");
  saveButton.disabled = true;
  saveButton.textContent = "Saving...";

  try {
    await updateDeckWithFlashcards(deckId, title, flashcards);
    window.location.href = `/decks/deck?id=${deckId}`;
  } catch (error) {
    showError("Something went wrong while saving changes. Please try again.");
    saveButton.disabled = false;
    saveButton.textContent = "Save Changes";
  }
});

(async function init() {
  const deckId = getDeckId();
  if (!deckId) {
    renderNotFound();
    return;
  }

  try {
    await initializeForm(deckId);
  } catch (error) {
    renderNotFound();
  }
})();
