//@ts-check

function main() {
  const loading = requireElement("loading");
  loading.style.display = "none";
  const content = requireElement("content");
  content.style.display = "block";

  const token = localStorage.getItem(TOKEN_KEY);
  const username = localStorage.getItem(USERNAME_KEY);
  if (token != null && username != null) {
    displayAuthenticatedLayout(username);
    // TODO
  } else {
    window.location.replace("/login/");
  }
}

document.addEventListener("DOMContentLoaded", main);
