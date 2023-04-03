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
function displayConversations(token) {
  const loading = requireElement("loading");
  loading.style.display = "block";
  const conversationDetails = requireElement("conversation_details");
  conversationDetails.style.display = "none";

  const params = new URLSearchParams('token=' + token);
  const request = fetch(CONVERSATIONS_URL + '?' + params, {
    method: "GET",
  });
  handleFetchResponseError(request).then(([_error, success]) => {
    if (success == null) {
      return;
    }

    const loading = requireElement("loading");
    loading.style.display = "none";
    const conversations = requireElement("conversations");
    conversations.style.display = "block";
    const content = requireElement("content");
    content.style.display = "block";

    const conversationsResponse = JSON.parse(success.content);
    const tableContent = conversationsResponse.Items.map((/** @type {Conversation} */ element) => {
      return `
        <tr>
          <td>${element.from.S}</td>
          <td>${element.name?.S ?? ''}</td>
          <td><a href="/conversations/#${element.from.S}">Dettagli</a></td>
        </tr>`;
    }).join('');
    const conversationsTableContent = requireElement("conversations_table_content");
    conversationsTableContent.innerHTML = tableContent;
  });
}

/**
 * @param {string} token
 * @param {string} from
 */
function displayConversationDetails(token, from) {
  const title = requireElement("title");
  title.innerHTML = `Numero: ${from}`;

  const loading = requireElement("loading");
  loading.style.display = "block";
  const conversations = requireElement("conversations");
  conversations.style.display = "none";

  const params = new URLSearchParams('token=' + token + '&from=' + from);
  const request = fetch(CONVERSATION_URL + '?' + params, {
    method: "GET",
  });
  handleFetchResponseError(request).then(([_error, success]) => {
    if (success == null) {
      return;
    }

    const loading = requireElement("loading");
    loading.style.display = "none";
    const conversationDetails = requireElement("conversation_details");
    conversationDetails.style.display = "block";
    const content = requireElement("content");
    content.style.display = "block";

    const conversationDetailsResponse = JSON.parse(success.content);
    const conversation = conversationDetailsResponse.Item;
    const nameInput = requireInputElement("name_input");
    nameInput.value = conversation.name?.S ?? '';

    attachUpdateConversationDetailsListener(token, conversation);

    // Load next appointment
    const nextAppointment = requireElement("next_appointment");
    nextAppointment.innerHTML = "Caricamento...";

    const params = new URLSearchParams('token=' + token + '&from=' + from);
    const request = fetch(NEXT_APPOINTMENT_URL + '?' + params, {
      method: "GET",
    });
    handleFetchResponseError(request).then(([_error, success]) => {
      if (success == null) {
        return;
      }

      const appointmentDetailsResponse = JSON.parse(success.content);
      if (appointmentDetailsResponse.Items.length == 0) {
        nextAppointment.innerHTML = 'Nessun appuntamento';
      } else {
        const nextAppointmentDetails = appointmentDetailsResponse.Items[0];
        const [date, time] = nextAppointmentDetails.datetime.S.split('T');
        nextAppointment.innerHTML = `<a href="/appointments/#${from}|${nextAppointmentDetails.datetime.S}">${date}, ore ${time}</a>`;
      }
    });
  });
}

/**
 * @param {string} token
 * @param {Conversation} conversation
 */
function attachUpdateConversationDetailsListener(token, conversation) {
  const submitButton = requireInputElement("update_conversation_details");
  const form = requireElement("conversation_details_form");

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    const nameInput = requireInputElement("name_input");

    submitButton.disabled = true;
    submitButton.value = "Caricamento...";

    const request = fetch(CONVERSATION_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        conversation: { from: conversation.from.S, name: nameInput.value }
      })
    });
    handleFetchResponseError(request).then(([error, success]) => {
      submitButton.disabled = false;
      submitButton.value = "Aggiorna";

      if (error != null) {
        return;
      }

      if (success == null) {
        throw new Error("Success can't be null");
      }

      const result = JSON.parse(success.content);
      console.log(result);

      const infoMessage = requireElement("info_message");
      infoMessage.innerHTML = "Conversazione aggiornata correttamente";
      infoMessage.style.display = "block";
    });
  });
}

function main() {
  const token = localStorage.getItem(TOKEN_KEY);
  const username = localStorage.getItem(USERNAME_KEY);
  if (token != null && username != null) {
    displayAuthenticatedLayout(username);
    if (location.hash == "") {
      displayConversations(token);
    } else {
      const [_, from] = location.hash.split('#');
      displayConversationDetails(token, from);
    }
  } else {
    window.location.replace("/login/");
  }
}

document.addEventListener("DOMContentLoaded", main);

function hashChange() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token != null) {
    if (location.hash == "") {
      displayConversations(token);
    } else {
      const [_, from] = location.hash.split('#');
      displayConversationDetails(token, from);
    }
  } else {
    window.location.replace("/login/");
  }
}

window.addEventListener("hashchange", hashChange);