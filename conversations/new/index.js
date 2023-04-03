//@ts-check

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
    handleFetchGenericError(request)
      .then(handleFetchAuthError)
      .then(([_error, success]) => {
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
