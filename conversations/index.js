//@ts-check

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
  handleFetchGenericError(request)
    .then(handleFetchAuthError)
    .then(([_error, success]) => {
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
          <td>${element.firstName?.S ?? ''}</td>
          <td>${element.lastName?.S ?? ''}</td>
          <td class="operation"><a href="/conversations/#${element.from.S}">Dettagli</a></td>
          <td class="operation"><a class="delete_conversation" href="#" data-from="${element.from.S}">Elimina</a></td>
        </tr>`;
      }).join('');
      const conversationsTableContent = requireElement("conversations_table_content");
      conversationsTableContent.innerHTML = tableContent;

      attachDeleteConversationListeners(token);
    });
}

/**
 * @param {string} token
 */
function attachDeleteConversationListeners(token) {
  const elements = document.getElementsByClassName("delete_conversation");
  let element;
  for (let i = 0; i < elements.length; i++) {
    element = elements[i];
    if (!(element instanceof HTMLElement)) {
      throw new Error("Missing element");
    }
    const from = element.dataset.from;
    element.addEventListener("click", function (event) {
      event.preventDefault();

      if (!confirm(`Vuoi eliminare ${from}?`)) {
        return;
      }

      const params = new URLSearchParams('token=' + token + '&from=' + from);
      const request = fetch(CONVERSATION_URL + '?' + params, {
        method: "DELETE",
      });
      handleFetchGenericError(request)
        .then(handleFetchAuthError)
        .then(([_error, success]) => {
          if (success == null) {
            return;
          }

          window.location.replace("/conversations/");
        });
    });
  }
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
  handleFetchGenericError(request)
    .then(handleFetchAuthError)
    .then(([_error, success]) => {
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
      const firstNameInput = requireInputElement("first_name_input");
      firstNameInput.value = conversation.firstName?.S ?? '';
      const lastNameInput = requireInputElement("last_name_input");
      lastNameInput.value = conversation.lastName?.S ?? '';
      const notesTextarea = requireTextAreaElement("notes_textarea");
      notesTextarea.value = conversation.notes?.S ?? '';
      const newAppointmentLink = requireAnchorElement("new_appointment_link");
      newAppointmentLink.href += `#${conversation.from.S}`;

      attachUpdateConversationDetailsListener(token, conversation);

      // Load next appointment
      const nextAppointment = requireElement("next_appointment");
      nextAppointment.innerHTML = "Caricamento...";

      const nextAppointmentParams = new URLSearchParams('token=' + token + '&from=' + from);
      const nextAppointmentRequest = fetch(NEXT_APPOINTMENT_URL + '?' + nextAppointmentParams, {
        method: "GET",
      });
      handleFetchGenericError(nextAppointmentRequest)
        .then(handleFetchAuthError)
        .then(([_error, success]) => {
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

      // Load contact appointments
      const appointments = requireElement("appointments");
      appointments.innerHTML = "<p>Caricamento...</p>";

      const appointmentsParams = new URLSearchParams('token=' + token + '&from=' + from);
      const appointmentsRequest = fetch(APPOINTMENTS_URL + '?' + appointmentsParams, {
        method: "GET",
      });
      handleFetchGenericError(appointmentsRequest)
        .then(handleFetchAuthError)
        .then(([_error, success]) => {
          if (success == null) {
            return;
          }

          const appointmentDetailsResponse = JSON.parse(success.content);
          if (appointmentDetailsResponse.Items.length == 0) {
            appointments.innerHTML = '<p>Nessun appuntamento</p>';
          } else {
            const appointmentsItems = appointmentDetailsResponse.Items.map((/** @type {Appointment} */ appointment) => {
              const [date, time] = appointment.datetime.S.split('T');
              return `<li><a href="/appointments/#${from}|${appointment.datetime.S}">${date}, ore ${time}</a></li>`;
            }).join('');
            appointments.innerHTML = `<ul>${appointmentsItems}</ul>`;
          }
        });

      // Load contact messages
      const messages = requireElement("messages");
      messages.innerHTML = "<p>Caricamento...</p>";

      const messagesParams = new URLSearchParams('token=' + token + '&from=' + from);
      const messagesRequest = fetch(MESSAGES_URL + '?' + messagesParams, {
        method: "GET",
      });
      handleFetchGenericError(messagesRequest)
        .then(handleFetchAuthError)
        .then(([_error, success]) => {
          if (success == null) {
            return;
          }

          const messagesResponse = JSON.parse(success.content);
          if (messagesResponse.Items.length == 0) {
            messages.innerHTML = '<p>Nessun messaggio</p>';
          } else {
            const messagesItems = messagesResponse.Items.map((/** @type {Message} */ message) => {
              console.log({ message });
              const date = new Date(parseInt(message.timestamp.S, 10) * 1000);
              const { body } = JSON.parse(message.text.S);
              console.log({ date, body });
              return `<li>${date.toLocaleString()}<br>${body}</li>`;
            }).join('');
            messages.innerHTML = `<ul>${messagesItems}</ul>`;
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

    const firstNameInput = requireInputElement("first_name_input");
    const lastNameInput = requireInputElement("last_name_input");
    const notesTextarea = requireTextAreaElement("notes_textarea");

    submitButton.disabled = true;
    submitButton.value = "Caricamento...";

    const request = fetch(CONVERSATION_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        conversation: {
          from: conversation.from.S,
          first_name: firstNameInput.value,
          last_name: lastNameInput.value,
          notes: notesTextarea.value
        }
      })
    });
    handleFetchGenericError(request)
      .then(handleFetchAuthError)
      .then(([error, success]) => {
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