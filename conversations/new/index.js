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
    const firstNameInput = requireInputElement("first_name_input");
    const lastNameInput = requireInputElement("last_name_input");
    const emailInput = requireInputElement("email_input");
    const heightInput = requireInputElement("height_input");
    const birthDateInput = requireInputElement("birth_date_input");
    const genderSelect = requireSelectElement("gender_select");
    const notesTextarea = requireTextAreaElement("notes_textarea");
    const privacyCheckbox = requireInputElement("privacy_checkbox");
    let privacyValue;
    if (privacyCheckbox.checked) {
      privacyValue = new Date().toISOString();
    } else {
      privacyValue = "";
    }

    submitButton.disabled = true;
    submitButton.value = "Caricamento...";

    const request = fetch(CONVERSATION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        conversation: {
          from: fromInput.value,
          first_name: firstNameInput.value,
          last_name: lastNameInput.value,
          email: emailInput.value,
          height: heightInput.value,
          birth_date: birthDateInput.value,
          gender: genderSelect.value,
          notes: notesTextarea.value,
          privacy: privacyValue
        }
      })
    });
    handleFetchGenericError(request)
      .then(handleFetchAuthError)
      .then(([_error, success]) => {
        submitButton.disabled = false;
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
  const auth = requireAuth();
  if (auth == null) {
    return;
  }
  const {token, username} = auth;
  const loading = requireElement("loading");
  loading.style.display = "none";
  const content = requireElement("content");
  content.style.display = "block";
  displayAuthenticatedLayout(username);
  attachCreateConversationListener(token);
}

document.addEventListener("DOMContentLoaded", main);
