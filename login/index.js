//@ts-check

const LOGIN_URL = "https://08b499nwhf.execute-api.us-east-1.amazonaws.com/default/filoDirettoAuth";

// TODO: move to common.js
/**
 * @param {Promise<Response>} promise
 * @returns {Promise<[?{status: number, content: string}, ?{status: number, content: string}]>}
 */
function handleFetchResponseError(promise) {
  // Reset error message
  const errorMessage = requireElement("error_message");
  errorMessage.innerHTML = "";
  errorMessage.style.display = "none";

  // Reset info message
  const infoMessage = requireElement("info_message");
  infoMessage.innerHTML = "";
  infoMessage.style.display = "none";

  return promise.then(res => {
    console.log("Response:", res);
    if (res.body != null) {
      const reader = res.body.getReader();
      return reader.read().then(({ done, value }) => {
        return { status: res.status, content: new TextDecoder().decode(value) };
      });
    }
    return { status: res.status, content: '' };
  }, error => ({ status: -1, content: error.toString() })).then(res => {
    if (res.status < 200 || res.status >= 300) {
      errorMessage.innerHTML = `Errore: (${res.status}), ${res.content}`;
      errorMessage.style.display = "block";
      return [res, null];
    }

    return [null, res];
  });
}

// TODO: move to common.js
function displayAnonymousLayout() {
  const authenticatedMenu = requireElement("authenticated");
  authenticatedMenu.style.display = "none";

  const anonymousMenu = requireElement("anonymous");
  anonymousMenu.style.display = "block";
}

function attachLoginEventListener() {
  const loginButton = requireInputElement("login_button");
  const loginForm = requireElement("login_form");

  loginForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const usernameInput = requireInputElement("username_input");
    const passwordInput = requireInputElement("password_input");

    loginButton.disabled = true;
    const originalLoginButtonValue = loginButton.value;
    loginButton.value = "Caricamento...";

    const request = fetch(LOGIN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: usernameInput.value, password: passwordInput.value })
    });
    handleFetchResponseError(request).then(([error, success]) => {
      loginButton.disabled = false;
      loginButton.value = originalLoginButtonValue;

      if (error != null) {
        return;
      }

      if (success == null) {
        throw new Error("Success can't be null");
      }

      let { token, username } = JSON.parse(success.content);
      token = JSON.stringify(token);
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
