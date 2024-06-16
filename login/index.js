//@ts-check

function redirectAuthenticated() {
  if (location.hash == "") {
    window.location.replace("/");
  } else {
    const [_, redirectTo] = location.hash.split('#');
    window.location.replace(decodeURIComponent(redirectTo));
  }
}

function attachLoginEventListener() {
  const loginButton = requireInputElement("login_button");
  const loginForm = requireElement("login_form");

  loginForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const usernameInput = requireInputElement("username_input");
    const passwordInput = requireInputElement("password_input");

    loginButton.disabled = true;
    loginButton.value = "Caricamento...";

    const request = fetch(LOGIN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: usernameInput.value, password: passwordInput.value })
    });
    handleFetchGenericError(request)
      .then(always(() => {
        loginButton.disabled = false;
        loginButton.value = "Accedi";
      }))
      .then(onSuccess((success) => {
        let { token, username } = JSON.parse(success.content);
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USERNAME_KEY, username);
        redirectAuthenticated();
      }));
  });
}

function main() {
  const token = localStorage.getItem(TOKEN_KEY);
  const username = localStorage.getItem(USERNAME_KEY);
  if (token != null && username != null) {
    redirectAuthenticated();
  } else {
    const loading = requireElement("loading");
    loading.style.display = "none";
    const content = requireElement("content");
    content.style.display = "block";
    attachLoginEventListener();
    displayAnonymousLayout();
  }
}

document.addEventListener("DOMContentLoaded", main);
