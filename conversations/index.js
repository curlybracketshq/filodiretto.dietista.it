//@ts-check

/**
 * @param {string} token
 */
function displayConversations(token) {
  const loading = requireElement("loading");
  loading.style.display = "block";
  const conversationDetails = requireElement("conversation_details");
  conversationDetails.style.display = "none";

  fetchConversations(token, ['firstName', 'lastName'], null, [])
    .then(items => {
      const loading = requireElement("loading");
      loading.style.display = "none";
      const conversations = requireElement("conversations");
      conversations.style.display = "block";
      const content = requireElement("content");
      content.style.display = "block";

      const tableContent = sortConversations(items)
        .map(element => {
          return `
          <tr>
            <td>${formatPhoneNumber(element.from.S)}</td>
            <td>${element.firstName?.S ?? ''}</td>
            <td>${element.lastName?.S ?? ''}</td>
            <td class="operation"><a href="${conversationURL(element)}">Dettagli</a></td>
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

      if (from == null) {
        return;
      }

      if (!confirm(`Vuoi eliminare ${formatPhoneNumber(from)}?`)) {
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
  title.innerHTML = `📇 Numero: ${formatPhoneNumber(from)}`;

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
      /** @type {Conversation} */
      const conversation = conversationDetailsResponse.Item;
      const firstNameInput = requireInputElement("first_name_input");
      firstNameInput.value = conversation.firstName?.S ?? '';
      const lastNameInput = requireInputElement("last_name_input");
      lastNameInput.value = conversation.lastName?.S ?? '';
      const emailInput = requireInputElement("email_input");
      emailInput.value = conversation.email?.S ?? '';
      const heightInput = requireInputElement("height_input");
      heightInput.value = conversation.height?.N ?? '';
      const birthDateInput = requireInputElement("birth_date_input");
      birthDateInput.value = conversation.birthDate?.S ?? '';
      const genderSelect = requireSelectElement("gender_select");
      genderSelect.value = conversation.gender?.S ?? '';
      const notesTextarea = requireTextAreaElement("notes_textarea");
      notesTextarea.value = conversation.notes?.S ?? '';
      const newAppointmentLink = requireAnchorElement("new_appointment_link");
      newAppointmentLink.href += `#${conversation.from.S}`;

      attachUpdateConversationDetailsListener(token, conversation);

      // Weights list
      let weightsList;
      if (conversation.weights?.S == null) {
        weightsList = [];
      } else {
        weightsList = JSON.parse(conversation.weights?.S);
      }
      displayWeights(token, conversation, weightsList);

      // Initialize new weight date input with today's date
      const weightDateInput = requireInputElement("weight_date_input");
      weightDateInput.value = new Date().toISOString().slice(0, 10);

      attachAddWeightListener(token, conversation);

      // Waist/hips list
      let waistHipsList;
      if (conversation.waistHips?.S == null) {
        waistHipsList = [];
      } else {
        waistHipsList = JSON.parse(conversation.waistHips?.S);
      }
      displayWaistHips(token, conversation, waistHipsList);

      // Initialize new waist/hip date input with today's date
      const waistHipDateInput = requireInputElement("waist_hip_date_input");
      waistHipDateInput.value = new Date().toISOString().slice(0, 10);

      attachAddWaistHipListener(token, conversation);

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
            const date = new Date(nextAppointmentDetails.datetime.S);
            nextAppointment.innerHTML = `
            <a href="${appointmentURL(nextAppointmentDetails)}">${formatDateTime(date)}</a>
            ${nextAppointmentDetails.type?.S != null ? '(' + displayAppointmentType(nextAppointmentDetails.type.S) + ')' : ''}
            `;
          }
        });

      // Load contact appointments
      const appointments = requireElement("appointments");
      appointments.innerHTML = "<p>Caricamento...</p>";

      fetchAppointments(token, from, null, null, [])
        .then(items => {
          if (items.length == 0) {
            appointments.innerHTML = '<p>Nessun appuntamento</p>';
          } else {
            const appointmentsItems = items.map((/** @type {Appointment} */ appointment) => {
              const date = new Date(appointment.datetime.S);
              return `
              <li>
                <a href="${appointmentURL(appointment)}">${formatDateTime(date)}</a>
                ${appointment.type?.S != null ? '(' + displayAppointmentType(appointment.type.S) + ')' : ''}
              </li>`;
            }).join('');
            appointments.innerHTML = `<ul>${appointmentsItems}</ul>`;
          }
        });

      // Load contact messages
      const messages = requireElement("messages");
      messages.innerHTML = "<p>Caricamento...</p>";

      fetchMessages(token, from, null, [])
        .then(items => {
          let canReply = false;
          if (items.length == 0) {
            messages.innerHTML = '<p>Nessun messaggio</p>';
          } else {
            const userMessages = items.filter(message => message.source == null);
            const lastMessage = userMessages.length > 0 ? userMessages[0] : { timestamp: { S: '0' } };
            const date = new Date(parseInt(lastMessage.timestamp.S, 10) * 1000);
            const now = new Date();
            const delta = now.getTime() - date.getTime();
            let replyBox;
            if (delta < 60 * 60 * 24 * 1000) {
              canReply = true;
              replyBox = `
              <form id="reply_form">
                <div>
                  <label>Risposta</label>
                  <textarea id="reply_textarea" name="reply" rows="5" cols="60"></textarea>
                </div>
                <div><input type="submit" id="send_reply" value="Invia" /></div>
              </form>
              <button class="primary" id="autocomplete_reply">Autocompleta</button>`;
            } else {
              replyBox = `
              <p>
                <strong>Nota:</strong> non puoi rispondere perché l'ultimo messaggio è stato inviato più di 24 ore fa.
              </p>`;
            }
            const messagesItems = items.map((/** @type {Message} */ message) => {
              const date = new Date(parseInt(message.timestamp.S, 10) * 1000);
              const text = message.text?.S;
              if (text == null) {
                throw new Error("Message text not present");
              }
              const { body } = JSON.parse(text);
              const source = message.source?.S ?? "";
              return messageItemHTML(source, date, body);
            }).join('');
            messages.innerHTML = `
            ${replyBox}
            <div id="messages_list">${messagesItems}</div>`;
          }

          if (canReply) {
            attachSendReplyListener(token, conversation);
            attachAutocompleteReplyListener(token);
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
    const emailInput = requireInputElement("email_input");
    const heightInput = requireInputElement("height_input");
    const birthDateInput = requireInputElement("birth_date_input");
    const genderSelect = requireSelectElement("gender_select");
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
          email: emailInput.value,
          height: heightInput.value,
          birth_date: birthDateInput.value,
          gender: genderSelect.value,
          notes: notesTextarea.value
        }
      })
    });
    handleFetchGenericError(request)
      .then(handleFetchAuthError)
      .then(always(() => {
        submitButton.disabled = false;
        submitButton.value = "Aggiorna";
      }))
      .then(onSuccess((success) => {
        const result = JSON.parse(success.content);

        const infoMessage = requireElement("info_message");
        infoMessage.innerHTML = "Conversazione aggiornata correttamente";
        infoMessage.style.display = "block";
      }));
  });
}

/**
 * @param {string} token
 */
function attachAutocompleteReplyListener(token) {
  // Where source is not 'filodiretto'
  const userMessages = document.querySelectorAll('.message:not(.filodiretto) .message_body');
  if (userMessages.length == 0 || !(userMessages[0] instanceof HTMLElement)) {
    return;
  }
  const lastMessageElement = userMessages[0];
  const message = lastMessageElement.innerText;
  const submitButton = requireInputElement("send_reply");
  const autocompleteButton = requireButtonElement("autocomplete_reply");

  autocompleteButton.addEventListener("click", function (event) {
    const replyTextarea = requireTextAreaElement("reply_textarea");

    submitButton.disabled = true;
    autocompleteButton.disabled = true;
    autocompleteButton.innerHTML = "Caricamento...";

    const request = fetch(AUTOCOMPLETE_MESSAGE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        message
      })
    });
    handleFetchGenericError(request)
      .then(handleFetchAuthError)
      .then(always(() => {
        submitButton.disabled = false;
        autocompleteButton.disabled = false;
        autocompleteButton.innerHTML = "Autocompleta";
      }))
      .then(onSuccess((success) => {
        const result = JSON.parse(success.content);

        replyTextarea.value = result.content;
      }));
  });
}

/**
 * @param {string} token
 * @param {Conversation} conversation
 */
function attachSendReplyListener(token, conversation) {
  const submitButton = requireInputElement("send_reply");
  const autocompleteButton = requireButtonElement("autocomplete_reply");
  const form = requireElement("reply_form");

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    const replyTextarea = requireTextAreaElement("reply_textarea");

    autocompleteButton.disabled = true;
    submitButton.disabled = true;
    submitButton.value = "Caricamento...";

    const request = fetch(SEND_MESSAGE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        to: conversation.from.S,
        content: replyTextarea.value
      })
    });
    handleFetchGenericError(request)
      .then(handleFetchAuthError)
      .then(always(() => {
        autocompleteButton.disabled = false;
        submitButton.disabled = false;
        submitButton.value = "Invia";
      }))
      .then(onSuccess((success) => {
        console.log(success.content);

        const date = new Date();
        const body = replyTextarea.value;
        // Conventional source for messages sent through the app
        const source = "filodiretto";
        const messageItem = document.createElement("div");
        messageItem.innerHTML = messageItemHTML(source, date, body);
        const messagesList = requireElement("messages_list");
        messagesList.prepend(messageItem);

        const infoMessage = requireElement("info_message");
        infoMessage.innerHTML = "Risposta inviata correttamente";
        infoMessage.style.display = "block";
      }));
  });
}

/**
 * @param {string} source
 * @param {Date} date
 * @param {string} body
 * @returns {string}
 */
function messageItemHTML(source, date, body) {
  return `
  <div class="message ${source}">
    <time datetime="${date.toISOString()}">${date.toLocaleString()}</time>
    <div class="message_body">${sanitizeHTML(body)}</div>
  </div>`;
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
