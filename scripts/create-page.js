import { saveDeckWithFlashcards } from "./db.js";

const form = document.querySelector("#create-deck-form");
const titleInput = document.querySelector("#deck-title");
const rowContainer = document.querySelector("#flashcard-rows");
const addRowButton = document.querySelector("#add-card");
const errorBox = document.querySelector("#form-error");

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
      const question = (inputs[0]?.value || "").trim();
      const answer = (inputs[1]?.value || "").trim();

      return { question, answer };
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

function addInitialRows() {
  for (let i = 0; i < 3; i += 1) {
    rowContainer.appendChild(createRow());
  }
}

addInitialRows();

addRowButton.addEventListener("click", () => {
  rowContainer.appendChild(createRow());
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError();

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
    await saveDeckWithFlashcards(title, flashcards);
    window.location.href = "../decks/index.html";
  } catch (error) {
    showError("Something went wrong while saving the deck. Please try again.");
    saveButton.disabled = false;
    saveButton.textContent = "Save Deck";
  }
});
