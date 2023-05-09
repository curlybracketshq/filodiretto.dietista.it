//@ts-check

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
    handleFetchGenericError(request).then(([error, success]) => {
      loginButton.disabled = false;
      loginButton.value = "Accedi";

      if (error != null) {
        return;
      }

      if (success == null) {
        throw new Error("Success can't be null");
      }

      let { token, username } = JSON.parse(success.content);
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USERNAME_KEY, username);
      window.location.replace("/");
    });
  });
}

function main() {
  const token = localStorage.getItem(TOKEN_KEY);
  const username = localStorage.getItem(USERNAME_KEY);
  if (token != null && username != null) {
    window.location.replace("/");
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
