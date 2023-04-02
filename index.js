//@ts-check

const LOGIN_URL = "https://08b499nwhf.execute-api.us-east-1.amazonaws.com/default/filoDirettoAuth";
const CONVERSATIONS_URL = "https://08b499nwhf.execute-api.us-east-1.amazonaws.com/default/filoDirettoConversations";
const CONVERSATION_URL = "https://08b499nwhf.execute-api.us-east-1.amazonaws.com/default/filoDirettoConversation";
const APPOINTMENTS_URL = "https://08b499nwhf.execute-api.us-east-1.amazonaws.com/default/filoDirettoAppointments";
const APPOINTMENT_URL = "https://08b499nwhf.execute-api.us-east-1.amazonaws.com/default/filoDirettoAppointment";
const NEXT_APPOINTMENT_URL = "https://08b499nwhf.execute-api.us-east-1.amazonaws.com/default/filoDirettoNextAppointment";
const SEND_APPOINTMENT_REMINDER_URL = "https://08b499nwhf.execute-api.us-east-1.amazonaws.com/default/filoDirettoSendAppointmentReminder";

/**
 * @typedef {Object} Appointment
 * @prop {{S: string}} from
 * @prop {{S: string}} datetime
 * @prop {?{S: string}} reminderSentAt
 */

/**
 * @typedef {Object} Conversation
 * @prop {{S: string}} from
 * @prop {?{S: string}} name
 */

/**
 * @param {Promise<Response>} promise
 * @returns {Promise<[?{status: number, content: string}, ?{status: number, content: string}]>}
 */
function handleFetchResponseError(promise) {
  // Reset error message
  const errorMessage = requireElement("error_message");
  errorMessage.innerHTML = "";

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
      if (res.status == 401) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USERNAME_KEY);
        displayLogin();
        displayAnonymousLayout();
        throw new Error('Unauthenticated request');
      }
      return [res, null];
    }

    return [null, res];
  });
}

/**
 * @param {string} token
 */
function displayConversations(token) {
  const title = requireElement("title");
  title.innerHTML = "Conversazioni";

  const content = requireElement("content");
  content.innerHTML = `<p>Caricamento...</p>`;

  const params = new URLSearchParams('token=' + token);
  const request = fetch(CONVERSATIONS_URL + '?' + params, {
    method: "GET",
  });
  handleFetchResponseError(request).then(([_error, success]) => {
    if (success == null) {
      return;
    }

    const conversationsResponse = JSON.parse(success.content);
    let contentHTML = `
    <div id="conversations">
    <p><button id="new_conversation">Nuovo numero</button></p>
    <table>
    <thead>
    <tr>
      <th>Numero</th>
      <th>Nome</th>
      <th>Operazioni</th>
    </tr>
    </thead>
    <tbody>`;
    conversationsResponse.Items.forEach((/** @type {Conversation} */ element) => {
      contentHTML += `
      <tr>
        <td>${element.from.S}</td>
        <td>${element.name?.S ?? ''}</td>
        <td><button id="conversation_${element.from.S}_info">Dettagli</button></td>
      </tr>`;
    });
    contentHTML += `
    </tbody>
    </table>
    </div>`;
    content.innerHTML = contentHTML;

    attachNewConversationListener(token);

    conversationsResponse.Items.forEach((/** @type {Conversation} */ element) => {
      const infoButton = requireElement(`conversation_${element.from.S}_info`);
      infoButton.addEventListener("click", function () {
        content.innerHTML = "<p>Caricamento...</p>";

        const params = new URLSearchParams('token=' + token + '&from=' + element.from.S);
        const request = fetch(CONVERSATION_URL + '?' + params, {
          method: "GET",
        });
        handleFetchResponseError(request).then(([_error, success]) => {
          if (success == null) {
            return;
          }

          const conversationDetailsResponse = JSON.parse(success.content);
          displayConversationDetails(token, conversationDetailsResponse.Item);
        });
      });
    });
  });
}

/**
 * @param {string} token
 */
function attachNewConversationListener(token) {
  const newConversationButton = requireElement("new_conversation");
  newConversationButton.addEventListener("click", function () {
    displayNewConversation(token);
  });
}

/**
 * @param {string} token
 */
function displayNewConversation(token) {
  const title = requireElement("title");
  title.innerHTML = "Nuovo numero";

  const content = requireElement("content");
  content.innerHTML = `
  <form id="new_conversation_form">
  <div>
    <label>Numero</label>
    <input type="text" id="from_input" name="from" />
  </div>
  <div>
    <label>Nome</label>
    <input type="text" id="name_input" name="name" />
  </div>
  <div><input type="submit" id="create_conversation" value="Crea" /></div>
  </form>`;

  attachCreateConversationListener(token);
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
      if (success == null) {
        return;
      }

      const result = JSON.parse(success.content);
      console.log(result);
      const newConversation = { from: { S: fromInput.value }, name: { S: nameInput.value } };
      displayConversationDetails(token, newConversation);
    });
  });
}

/**
 * @param {string} token
 * @param {Conversation} conversation
 */
function displayConversationDetails(token, conversation) {
  const title = requireElement("title");
  title.innerHTML = `Numero: ${conversation.from.S}`;

  const content = requireElement("content");
  content.innerHTML = `
  <form id="conversation_details_form">
  <div>
    <label>Nome</label>
    <input type="text" id="name_input" name="name" value="${conversation.name?.S ?? ''}"/>
  </div>
  <div><input type="submit" id="update_conversation_details" value="Aggiorna" /></div>
  </form>
  <p>Prossimo appuntamento: <span id="next_appointment"></span></p>
  <p><button id="new_appointment">Nuovo appuntamento (TODO)</button></p>
  <p><button id="send_appointment_reminder" disabled>Invia promemoria appuntamento</button></p>`;

  attachUpdateConversationDetailsListener(token, conversation);
  attachNewAppointmentListener(token, conversation);

  // Load next appointment
  const nextAppointment = requireElement("next_appointment");
  nextAppointment.innerHTML = "Caricamento...";

  const params = new URLSearchParams('token=' + token + '&from=' + conversation.from.S);
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
      nextAppointment.innerHTML = `${date}, ore ${time}`;

      attachSendAppointmentReminderListener(token, nextAppointmentDetails);
    }
  });
}

/**
 * @param {string} token
 * @param {Appointment} appointment
 */
function attachSendAppointmentReminderListener(token, appointment) {
  const sendButton = requireButtonElement("send_appointment_reminder");
  sendButton.disabled = false;
  sendButton.addEventListener("click", function () {
    if (!confirm("Vuoi mandare un promemoria per questo appuntamento?")) {
      return;
    }

    if (appointment.reminderSentAt != null && !confirm(`Hai già inviato un promemoria in data ${appointment.reminderSentAt.S}, vuoi inviare un altro promemoria?`)) {
      return;
    }

    const [date, time] = appointment.datetime.S.split('T');
    const dateObj = new Date(date);
    const dateStr = dateToString(dateObj);
    sendButton.disabled = true;
    const request = fetch(SEND_APPOINTMENT_REMINDER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        appointment: { from: appointment.from.S, datetime: appointment.datetime.S },
        message: { to: appointment.from.S, date: dateStr, time }
      })
    });
    handleFetchResponseError(request).then(([error, success]) => {
      sendButton.disabled = false;
      console.log(error, success);
      if (success == null) {
        return;
      }
      // TODO: notify success
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
      if (error != null) {
        displayConversationDetails(token, conversation);
        return;
      }

      if (success == null) {
        throw new Error("Success can't be null");
      }

      const result = JSON.parse(success.content);
      const updatedConversation = result.Attributes;
      displayConversationDetails(token, updatedConversation);
    });
  });
}

/**
 * @param {string} token
 * @param {Conversation} conversation
 */
function attachNewAppointmentListener(token, conversation) {
  const newAppointmentButton = requireElement("new_appointment");
  newAppointmentButton.addEventListener("click", function () {
    console.log("TODO");
  });
}

function displayLogin() {
  const content = requireElement("content");
  content.innerHTML = `
  <form id="login_form">
  <div><label>Nome utente</label><input type="text" id="username_input" name="username" /></div>
  <div><label>Password</label><input type="password" id="password_input" name="password" /></div>
  <div><input type="submit" id="login_button" value="Accedi" /></div>
  </form>`;

  attachLoginEventListener();
}

function displayAnonymousLayout() {
  const authenticatedMenu = requireElement("authenticated");
  authenticatedMenu.style.display = "none";

  const anonymousMenu = requireElement("anonymous");
  anonymousMenu.style.display = "block";

  const title = requireElement("title");
  title.innerHTML = "Filo Diretto";

  const subtitle = requireElement("subtitle");
  subtitle.style.display = "block";
}

/**
 * @param {string} token
 * @param {string} username
 */
function displayAuthenticatedLayout(token, username) {
  const authenticatedMenu = requireElement("authenticated");
  authenticatedMenu.style.display = "block";

  const anonymousMenu = requireElement("anonymous");
  anonymousMenu.style.display = "none";

  const usernameMenuItem = requireElement("username");
  usernameMenuItem.innerHTML = username;

  const subtitle = requireElement("subtitle");
  subtitle.style.display = "none";

  attachLogoutEventListener();
  attachConversationsEventListener(token);
  attachCalendarEventListener(token);
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
    handleFetchResponseError(request).then(([error, success]) => {
      if (error != null) {
        displayLogin();
        return;
      }

      if (success == null) {
        throw new Error("Success can't be null");
      }

      let { token, username } = JSON.parse(success.content);
      token = JSON.stringify(token);
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USERNAME_KEY, username);
      displayConversations(token);
      displayAuthenticatedLayout(token, username);
    });
  });
}

function attachLogoutEventListener() {
  const logoutLink = requireElement("logout");
  logoutLink.addEventListener("click", function (event) {
    event.preventDefault();
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USERNAME_KEY);
    displayLogin();
    displayAnonymousLayout();
  });
}

/**
 * @param {string} token
 */
function attachConversationsEventListener(token) {
  const conversationsLink = requireElement("conversation_menu_item");
  conversationsLink.addEventListener("click", function (event) {
    event.preventDefault();
    displayConversations(token);
  });
}

/**
 * @param {string} token
 */
function attachCalendarEventListener(token) {
  const calendarLink = requireElement("calendar_menu_item");
  calendarLink.addEventListener("click", function (event) {
    event.preventDefault();
    displayCalendar(token);
  });
}

/**
 * @param {string} token
 */
function displayCalendar(token) {
  const title = requireElement("title");
  title.innerHTML = "Calendario";

  const content = requireElement("content");
  content.innerHTML = `<p>Caricamento...</p>`;

  const params = new URLSearchParams('token=' + token);
  const request = fetch(APPOINTMENTS_URL + '?' + params, {
    method: "GET",
  });
  handleFetchResponseError(request).then(([_error, success]) => {
    if (success == null) {
      return;
    }

    const appointmentsResponse = JSON.parse(success.content);
    const appointmentsByMonth = appointmentsResponse.Items.reduce(function (/** @type {Object.<string, Appointment[]>} */ collection, /** @type {Appointment} */ element) {
      const [date, _time] = element.datetime.S.split('T');
      const [year, month, _day] = date.split('-');
      const yearMonth = `${year}-${month}`;
      if (yearMonth in collection) {
        collection[yearMonth].push(element);
      } else {
        collection[yearMonth] = [element];
      }
      return collection;
    }, {});
    const sortedMonths = Object.keys(appointmentsByMonth).sort();
    let contentHTML = `<div id="calendar">`;
    sortedMonths.forEach((/** @type {string} */ yearMonth) => {
      const [year, month] = yearMonth.split('-');
      const monthlyAppointments = appointmentsByMonth[yearMonth].sort(function (a, b) {
        if (a.datetime.S < b.datetime.S) {
          return -1;
        }
        if (a.datetime.S > b.datetime.S) {
          return 1;
        }
        return 0;
      }).map(function (/** @type {Appointment} */ element) {
        const [date, time] = element.datetime.S.split('T');
        const dateObj = new Date(date);
        const weekday = dateObj.getUTCDay();
        const day = dateObj.getUTCDate();
        return `
          <tr>
            <td>${weekdayName(weekday)} ${day}</td>
            <td>${time}</td>
            <td>${element.from.S}</td>
            <td><button id="appointment_${element.from.S}_${element.datetime.S}_info">Dettagli</button></td>
          </tr>`;
      }).join('');
      contentHTML += `
      <h2>${monthName(parseInt(month, 10))} ${year}</h2>
      <table>
      <thead>
      <tr>
        <th>Data</th>
        <th>Ora</th>
        <th>Numero</th>
        <th>Operazioni</th>
      </tr>
      </thead>
      <tbody>${monthlyAppointments}</tbody>
      </table>`;
    });
    contentHTML += `
    </div>`;
    content.innerHTML = contentHTML;

    appointmentsResponse.Items.forEach((/** @type {Appointment} */ element) => {
      const infoButton = requireElement(`appointment_${element.from.S}_${element.datetime.S}_info`);
      infoButton.addEventListener("click", function () {
        content.innerHTML = "<p>Caricamento...</p>";

        const params = new URLSearchParams('token=' + token + '&from=' + element.from.S + '&datetime=' + element.datetime.S);
        const request = fetch(APPOINTMENT_URL + '?' + params, {
          method: "GET",
        });
        handleFetchResponseError(request).then(([_error, success]) => {
          if (success == null) {
            return;
          }

          const appointmentDetailsResponse = JSON.parse(success.content);
          displayAppointmentDetails(token, appointmentDetailsResponse.Item);
        });
      });
    });
  });
}

/**
 * @param {string} token
 * @param {Appointment} appointment
 */
function displayAppointmentDetails(token, appointment) {
  const title = requireElement("title");
  const [date, time] = appointment.datetime.S.split('T');
  const dateObj = new Date(date);
  const month = dateObj.getUTCMonth() + 1;
  const day = dateObj.getUTCDate();
  title.innerHTML = `Appuntamento del ${day} ${monthName(month).toLowerCase()} alle ${time}`;

  const content = requireElement("content");
  const reminderSentAt = appointment.reminderSentAt == null ? 'non inviato' : `inviato il ${appointment.reminderSentAt.S}`;
  content.innerHTML = `
  <p>Numero: ${appointment.from.S}</p>
  <p>Promemoria: <span id="reminder_sent_at">${reminderSentAt}</span></p>
  <p><button id="send_appointment_reminder">Invia promemoria appuntamento</button></p>`;

  attachSendAppointmentReminderListener(token, appointment);
}

function main() {
  const content = requireElement("content");
  content.style.display = "block";

  const token = localStorage.getItem(TOKEN_KEY);
  const username = localStorage.getItem(USERNAME_KEY);
  if (token != null && username != null) {
    displayConversations(token);
    displayAuthenticatedLayout(token, username);
  } else {
    displayLogin();
    displayAnonymousLayout();
  }
}

document.addEventListener("DOMContentLoaded", main);