//@ts-check

// TODO: move to common.js
/**
 * @param {string} username
 */
function displayAuthenticatedLayout(username) {
  const authenticatedMenu = requireElement("authenticated");
  authenticatedMenu.style.display = "block";

  const anonymousMenu = requireElement("anonymous");
  anonymousMenu.style.display = "none";

  const usernameMenuItem = requireElement("username");
  usernameMenuItem.innerHTML = username;

  attachLogoutEventListener();
}

// TODO: move to common.js
function attachLogoutEventListener() {
  const logoutLink = requireElement("logout");
  logoutLink.addEventListener("click", function (event) {
    event.preventDefault();
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USERNAME_KEY);
    window.location.replace("/");
  });
}

// TODO: move to common.js
function displayAnonymousLayout() {
  const authenticatedMenu = requireElement("authenticated");
  authenticatedMenu.style.display = "none";

  const anonymousMenu = requireElement("anonymous");
  anonymousMenu.style.display = "block";
}

function main() {
  const loading = requireElement("loading");
  loading.style.display = "none";
  const content = requireElement("content");
  content.style.display = "block";

  const authenticatedContent = requireElement("authenticated_content");
  const anonymousContent = requireElement("anonymous_content");

  const token = localStorage.getItem(TOKEN_KEY);
  const username = localStorage.getItem(USERNAME_KEY);
  if (token != null && username != null) {
    displayAuthenticatedLayout(username);
    authenticatedContent.style.display = "block";
    anonymousContent.style.display = "none";
  } else {
    displayAnonymousLayout();
    authenticatedContent.style.display = "none";
    anonymousContent.style.display = "block";
  }
}

document.addEventListener("DOMContentLoaded", main);
