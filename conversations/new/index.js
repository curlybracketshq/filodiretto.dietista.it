//@ts-check

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
      if (res.status == 401) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USERNAME_KEY);
        window.location.replace("/login/");
      }
      return [res, null];
    }

    return [null, res];
  });
}

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

/**
 * @param {string} token
 */
function attachCreateConversationListener(token) {
  const submitButton = requireInputElement("create_conversation");
  const form = requireElement("new_conversation_form");

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    const fromInput = requireInputElement("from_input");
    const nameInput = requireInputElement("name_input");

    submitButton.disabled = true;
    submitButton.value = "Caricamento...";

    const request = fetch(CONVERSATION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        conversation: { from: fromInput.value, name: nameInput.value }
      })
    });
    handleFetchResponseError(request).then(([_error, success]) => {
      submitButton.disabled = true;
      submitButton.value = "Crea";

      if (success == null) {
        return;
      }

      const result = JSON.parse(success.content);
      console.log(result);
      window.location.replace(`/conversations/#${fromInput.value}`);
    });
  });
}

function main() {
  const token = localStorage.getItem(TOKEN_KEY);
  const username = localStorage.getItem(USERNAME_KEY);
  if (token != null && username != null) {
    const loading = requireElement("loading");
    loading.style.display = "none";
    const content = requireElement("content");
    content.style.display = "block";
    displayAuthenticatedLayout(username);
    attachCreateConversationListener(token);
  } else {
    window.location.replace("/login/");
  }
}

document.addEventListener("DOMContentLoaded", main);
