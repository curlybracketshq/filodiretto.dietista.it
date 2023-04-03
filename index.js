//@ts-check

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
