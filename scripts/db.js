const DATABASE_NAME = "quickcards-db";
const DATABASE_VERSION = 1;
const DECK_STORE = "decks";
const FLASHCARD_STORE = "flashcards";

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(DECK_STORE)) {
        db.createObjectStore(DECK_STORE, { keyPath: "id", autoIncrement: true });
      }

      if (!db.objectStoreNames.contains(FLASHCARD_STORE)) {
        const flashcardStore = db.createObjectStore(FLASHCARD_STORE, {
          keyPath: "id",
          autoIncrement: true,
        });
        flashcardStore.createIndex("deckId", "deckId", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Failed to open database"));
  });
}

function runTransaction(db, storeNames, mode, work) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeNames, mode);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("Transaction failed"));
    tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));

    work(tx);
  });
}

export async function saveDeckWithFlashcards(title, flashcards) {
  const db = await openDatabase();
  const now = new Date().toISOString();
  let deckId = null;

  await runTransaction(db, [DECK_STORE, FLASHCARD_STORE], "readwrite", (tx) => {
    const deckStore = tx.objectStore(DECK_STORE);
    const flashcardStore = tx.objectStore(FLASHCARD_STORE);

    const deckRequest = deckStore.add({ title, createdAt: now });

    deckRequest.onsuccess = () => {
      deckId = Number(deckRequest.result);
      flashcards.forEach((card) => {
        flashcardStore.add({
          deckId,
          question: card.question,
          answer: card.answer,
          createdAt: now,
        });
      });
    };
  });

  db.close();
  return deckId;
}

function getAll(store) {
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error || new Error("Failed to read store data"));
  });
}

function getByKey(store, key) {
  return new Promise((resolve, reject) => {
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error || new Error("Failed to read record"));
  });
}

function getByIndex(index, key) {
  return new Promise((resolve, reject) => {
    const request = index.getAll(key);
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error || new Error("Failed to read index data"));
  });
}

export async function getDecksWithCounts() {
  const db = await openDatabase();
  const tx = db.transaction([DECK_STORE, FLASHCARD_STORE], "readonly");
  const deckStore = tx.objectStore(DECK_STORE);
  const flashcardStore = tx.objectStore(FLASHCARD_STORE);

  const [decks, flashcards] = await Promise.all([getAll(deckStore), getAll(flashcardStore)]);

  const countByDeckId = flashcards.reduce((acc, card) => {
    const key = Number(card.deckId);
    acc.set(key, (acc.get(key) || 0) + 1);
    return acc;
  }, new Map());

  const decoratedDecks = decks
    .map((deck) => ({
      ...deck,
      cardCount: countByDeckId.get(Number(deck.id)) || 0,
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  db.close();
  return decoratedDecks;
}

export async function deleteDeck(deckId) {
  const db = await openDatabase();
  const numericDeckId = Number(deckId);

  await runTransaction(db, [DECK_STORE, FLASHCARD_STORE], "readwrite", (tx) => {
    const deckStore = tx.objectStore(DECK_STORE);
    const flashcardStore = tx.objectStore(FLASHCARD_STORE);
    const index = flashcardStore.index("deckId");
    const cursorRequest = index.openCursor(IDBKeyRange.only(numericDeckId));

    cursorRequest.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    deckStore.delete(numericDeckId);
  });

  db.close();
}

export async function getDeckById(deckId) {
  const db = await openDatabase();
  const tx = db.transaction([DECK_STORE], "readonly");
  const deckStore = tx.objectStore(DECK_STORE);
  const deck = await getByKey(deckStore, Number(deckId));
  db.close();
  return deck;
}

export async function getFlashcardsByDeckId(deckId) {
  const db = await openDatabase();
  const tx = db.transaction([FLASHCARD_STORE], "readonly");
  const flashcardStore = tx.objectStore(FLASHCARD_STORE);
  const deckIndex = flashcardStore.index("deckId");
  const cards = await getByIndex(deckIndex, Number(deckId));
  db.close();
  return cards;
}

export async function getDeckWithFlashcards(deckId) {
  const [deck, flashcards] = await Promise.all([getDeckById(deckId), getFlashcardsByDeckId(deckId)]);

  return {
    deck,
    flashcards,
  };
}

export async function updateDeckWithFlashcards(deckId, title, flashcards) {
  const db = await openDatabase();
  const numericDeckId = Number(deckId);
  const now = new Date().toISOString();

  await runTransaction(db, [DECK_STORE, FLASHCARD_STORE], "readwrite", (tx) => {
    const deckStore = tx.objectStore(DECK_STORE);
    const flashcardStore = tx.objectStore(FLASHCARD_STORE);
    const deckRequest = deckStore.get(numericDeckId);

    deckRequest.onsuccess = () => {
      const existingDeck = deckRequest.result;
      if (!existingDeck) {
        tx.abort();
        return;
      }

      deckStore.put({
        ...existingDeck,
        id: numericDeckId,
        title,
        updatedAt: now,
      });

      const keysRequest = flashcardStore.index("deckId").getAllKeys(numericDeckId);
      keysRequest.onsuccess = () => {
        const keys = keysRequest.result || [];
        keys.forEach((key) => flashcardStore.delete(key));

        flashcards.forEach((card) => {
          flashcardStore.add({
            deckId: numericDeckId,
            question: card.question,
            answer: card.answer,
            createdAt: now,
          });
        });
      };
    };
  });

  db.close();
}
