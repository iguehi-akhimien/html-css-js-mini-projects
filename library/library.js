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
  };

  request.onupgradeneeded = (event) => {
    const innerDB = event.target.result;
    if (!innerDB.objectStoreNames.contains(STORE_NAME)) {
      innerDB.createObjectStore(STORE_NAME, { keyPath: "key" });
    }
  };

  request.onsuccess = (event) => {
    db = event.target.result;
    console.info("Success!");
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

  // showLoading --> true

  try {
    console.log("Library search for:", `${SEARCH_API}?${params}`);
    const response = await fetch(`${SEARCH_API}?${params}`);
    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    const limitedDocs = data.docs.slice(0, MAX_RESULTS);
    // display the search results
  } catch (error) {
    // show error to user
  } finally {
    // showLoading --> false
  }
};

const displaySearchResults = (books) => {
  if (!books || books.length === 0) {
    // show error
    return;
  }
  // clear error
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
  
};

initDB();
