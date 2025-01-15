const SEARCH_API = "https://openlibrary.org/search.json";
const COVERS_API = "https://covers.openlibrary.org/b";
const DB_NAME = "libraryDB";
const DB_VERSION = 1;
const STORE_NAME = "books";
const MAX_RESULTS = 10;

const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");
const resultsBody = document.getElementById("results-body");
const libraryBody = document.getElementById("library-body");
const loadingEl = document.getElementById("loading");
const errorEl = document.getElementById("error-message");
const searchViewBtn = document.getElementById("search-view-btn");
const libraryViewBtn = document.getElementById("library-view-btn");
const searchSection = document.getElementById("search-section");
const librarySection = document.getElementById("library-section");
const bookRowTemplate = document.getElementById("book-row-template");

const authorInput = document.getElementById("author");
const languageSelect = document.getElementById("language");
const subjectInput = document.getElementById("subject");
const publisherInput = document.getElementById("publisher");

window.addEventListener("DOMContentLoaded", () => {
  languageSelect.value = "eng";
});

let db;

const initDB = () => {
  // request to open a database connection
  const request = indexedDB.open(DB_NAME, DB_VERSION);

  request.onerror = (event) => {
    console.error("Database error:", event.target.error);
    showError(`"Database error:", ${event.target.error}`);
  };

  request.onupgradeneeded = (event) => {
    const innerDB = event.target.result;
    if (!innerDB.objectStoreNames.contains(STORE_NAME)) {
      innerDB.createObjectStore(STORE_NAME, { keyPath: "key" });
    }
  };

  request.onsuccess = (event) => {
    db = event.target.result;
    loadLibrary();
  };
};

const searchBooks = async () => {
  const searchTerm = searchInput.value.trim();
  if (!searchTerm) return;

  const params = new URLSearchParams();
  params.append("q", searchTerm);
  params.append("limit", MAX_RESULTS.toString());
  params.append("language", "eng");

  const additionalParams = {
    author: authorInput.value.trim(),
    subject: subjectInput.value.trim(),
    publisher: publisherInput.value.trim(),
  };

  Object.entries(additionalParams).forEach(([key, value]) => {
    if (value) {
      params.append(key, value);
    }
  });

  showLoading(true);

  try {
    console.log("Library search for:", `${SEARCH_API}?${params}`);
    const response = await fetch(`${SEARCH_API}?${params}`);
    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    const limitedDocs = data.docs.slice(0, MAX_RESULTS);
    displaySearchResults(limitedDocs);
  } catch (error) {
    showError(`Failed to fetch books: ${error.message}`);
  } finally {
    showLoading(false);
  }
};

const displaySearchResults = (books) => {
  if (!books || books.length === 0) {
    showError("No books found!");
    return;
  }
  clearError();
  resultsBody.innerHTML = "";
  books.forEach((book, index) => {
    const row = createBookRow(book, index + 1, false);
    resultsBody.appendChild(row);
  });
};

const createBookRow = (book, id, isLibraryView = false) => {
  // clone the template
  const row = bookRowTemplate.content.cloneNode(true);

  row.querySelector(".book-id").textContent = id;
  row.querySelector(".book-title").textContent = book.title;
  row.querySelector(".book-author").textContent = `Author: ${
    book.author_name?.[0] || "Unknown"
  }`;
  row.querySelector(".book-year").textContent = `Year: ${
    book.first_publish_year || "Unknown"
  }`;
  row.querySelector(".book-pages").textContent = `Pages: ${
    book.number_of_pages_median || "Unknown"
  }`;
  row.querySelector(".book-description").textContent =
    book.description || "No description available";

  // Getting cover images
  const coverImg = row.querySelector(".cover-image");
  if (book.cover_i) {
    coverImg.dataset.coverId = book.cover_i;
    coverImg.addEventListener("click", loadBookCover);
  }

  // setup the action buttons
  const markButton = row.querySelector(".mark-button");
  const deleteButton = row.querySelector(".delete-button");
  const bookKey = book.key;

  if (isLibraryView) {
    deleteButton.classList.remove("hidden");
    deleteButton.addEventListener("click", () => {
      removeFromLibrary(book.key).then(loadLibrary);
    });

    const isRead = book.isRead;
    updateReadStatusButton(markButton, isRead);
    markButton.addEventListener("click", async () => {
      book.isRead = !book.isRead;
      await addToLibrary(book);
      updateReadStatusButton(markButton, book.isRead);
    });
  } else {
    markButton.textContent = "Add to Library";
    markButton.classList.remove("read", "unread");

    checkIfInLibrary(bookKey).then((existingBook) => {
      if (existingBook) {
        markButton.textContent = "Already in Library";
        markButton.disabled = true;
      } else {
        markButton.addEventListener("click", async () => {
          await addToLibrary({ ...book, isRead: false });
          markButton.textContent = "Added to Library";
          markButton.disabled = true;
          loadLibrary();
        });
      }
    });
  }
  return row;
};

const loadBookCover = async (event) => {
  const img = event.target;
  const coverId = img.dataset.coverId;
  if (coverId) {
    img.src = `${COVERS_API}/id/${coverId}-M.jpg`;
    console.log("Fetching cover: ", `${COVERS_API}/id/${coverId}-M.jpg`);
  }
};

const updateReadStatusButton = (button, isRead) => {
  button.textContent = isRead ? "Mark as Unread" : "Mark as Read";
  button.classList.remove("read", "unread");
  button.classList.add(isRead ? "read" : "unread");
};

const addToLibrary = (book) => {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({ ...book, key: book.key });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const removeFromLibrary = (key) => {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const checkIfInLibrary = (key) => {
  return new Promise((resolve) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
};

const loadLibrary = () => {
  const transaction = db.transaction([STORE_NAME], "readonly");
  const store = transaction.objectStore(STORE_NAME);
  const request = store.getAll();

  request.onsuccess = () => {
    const books = request.result;
    libraryBody.innerHTML = "";
    books.forEach((book, index) => {
      const row = createBookRow(book, index + 1, true);
      libraryBody.appendChild(row);
    });
  };
};

const clearError = () => {
  errorEl.textContent = "";
  errorEl.classList.add("hidden");
};

const showLoading = (show) => {
  loadingEl.classList.toggle("hidden", !show);
  if (show) {
    clearError();
  }
};

const showError = (message) => {
  errorEl.textContent = message;
  errorEl.classList.remove("hidden");
  loadingEl.classList.add("hidden");
};

const toggleView = (showLibrary) => {
  clearError();
  searchSection.classList.toggle("hidden", showLibrary);
  librarySection.classList.toggle("hidden", !showLibrary);
  searchViewBtn.classList.toggle("active", !showLibrary);
  libraryViewBtn.classList.toggle("active", showLibrary);
};

searchBtn.addEventListener("click", searchBooks);
searchInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    searchBooks();
  }
});
searchViewBtn.addEventListener("click", () => toggleView(false));
libraryViewBtn.addEventListener("click", () => toggleView(true));

initDB();
