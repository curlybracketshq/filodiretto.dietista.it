//@ts-check

const TOKEN_KEY = 'TOKEN';
const USERNAME_KEY = 'USERNAME';

const LOGIN_URL = "https://08b499nwhf.execute-api.us-east-1.amazonaws.com/default/filoDirettoAuth";
const CONVERSATIONS_URL = "https://08b499nwhf.execute-api.us-east-1.amazonaws.com/default/filoDirettoConversations";
const CONVERSATION_URL = "https://08b499nwhf.execute-api.us-east-1.amazonaws.com/default/filoDirettoConversation";
const APPOINTMENTS_URL = "https://08b499nwhf.execute-api.us-east-1.amazonaws.com/default/filoDirettoAppointments";
const APPOINTMENT_URL = "https://08b499nwhf.execute-api.us-east-1.amazonaws.com/default/filoDirettoAppointment";
const NEXT_APPOINTMENT_URL = "https://08b499nwhf.execute-api.us-east-1.amazonaws.com/default/filoDirettoNextAppointment";

/**
 * @param {Promise<Response>} promise
 * @returns {Promise<[?{status: number, content: string}, ?{status: number, content: string}]>}
 */
function handleFetchResponseError(promise) {
  // Reset error message
  const errorMessage = document.getElementById("error_message");
  if (errorMessage == null) {
    throw new Error("Missing element");
  }
  errorMessage.innerHTML = "";

  return promise.then(res => {
    console.log("Response:", res);
    if (res.body != null) {
      const reader = res.body.getReader()
      return reader.read().then(({ done, value }) => {
        return { status: res.status, content: new TextDecoder().decode(value) };
      })
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
  const title = document.getElementById("title");
  if (title == null) {
    throw new Error("Missing element");
  }
  title.innerHTML = "Conversazioni";

  const content = document.getElementById("content");
  if (content == null) {
    throw new Error("Missing element");
  }
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
        <td id="conversation_${element.from.S}_name">${element.name?.S ?? ''}</td>
        <td><button id="conversation_${element.from.S}_info">Dettagli</button></td>
      </tr>`;
    });
    contentHTML += `
    </tbody>
    </table>
    </div>
    <div id="conversation_details">
    </div>`;
    content.innerHTML = contentHTML;

    const conversationsTable = document.getElementById("conversations");
    const conversationDetails = document.getElementById("conversation_details");
    if (conversationDetails == null || conversationsTable == null) {
      throw new Error("Missing element");
    }

    conversationsResponse.Items.forEach((/** @type {Conversation} */ element) => {
      const infoButton = document.getElementById(`conversation_${element.from.S}_info`);
      if (infoButton == null || !(infoButton instanceof HTMLButtonElement)) {
        throw new Error("Missing element");
      }

      infoButton.addEventListener("click", function (event) {
        conversationsTable.style.display = "none";
        conversationDetails.style.display = "block";
        conversationDetails.innerHTML = "<p>Caricamento...</p>";

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
  });;
}

/**
 * @typedef {Object} Conversation
 * @prop {{S: string}} from
 * @prop {?{S: string}} name
 */

/**
 * @param {string} token
 * @param {Conversation} conversation
 */
function displayConversationDetails(token, conversation) {
  const conversationsTable = document.getElementById("conversations");
  const conversationDetails = document.getElementById("conversation_details");
  if (conversationDetails == null || conversationsTable == null) {
    throw new Error("Missing element");
  }

  conversationDetails.innerHTML = `
  <h2>Numero: ${conversation.from.S}</h2>
  <form id="conversation_details_form">
  <div>
    <label>Nome</label>
    <input type="text" id="name_input" name="from" value="${conversation.name?.S ?? ''}"/>
  </div>
  <div><input type="submit" id="update_conversation_details" value="Aggiorna" /></div>
  </form>
  <p>Prossimo appuntamento: <span id="next_appointment"></span></p>
  <p>
    <button id="new_appointment">Nuovo appuntamento (TODO)</button>
    <button id="close_conversation_details" class="primary">Chiudi</button>
  </p>`;

  attachCloseConversationDetailsListener(conversationsTable, conversationDetails);
  attachUpdateConversationDetailsListener(token, conversation);
  attachNewAppointmentListener(token, conversation);

  // Load next appointment
  const nextAppointment = document.getElementById("next_appointment");
  if (nextAppointment == null) {
    throw new Error("Missing element");
  }
  nextAppointment.innerHTML = "Caricamento...";

  const errorMessage = document.getElementById("error_message");
  if (errorMessage == null) {
    throw new Error("Missing element");
  }
  errorMessage.innerHTML = "";

  const params = new URLSearchParams('token=' + token + '&from=' + conversation.from.S);
  const request = fetch(NEXT_APPOINTMENT_URL + '?' + params, {
    method: "GET",
  })
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
    }
  });
}

/**
 * @param {HTMLElement} conversationsTable
 * @param {HTMLElement} conversationDetails
 */
function attachCloseConversationDetailsListener(conversationsTable, conversationDetails) {
  const closeConversationDetailsButton = document.getElementById("close_conversation_details");
  if (closeConversationDetailsButton == null) {
    throw new Error("Missing element");
  }

  closeConversationDetailsButton.addEventListener("click", function () {
    conversationsTable.style.display = "block";
    conversationDetails.style.display = "none";
  });
}

/**
 * @param {string} token
 * @param {Conversation} conversation
 */
function attachUpdateConversationDetailsListener(token, conversation) {
  const conversationDetailsForm = document.getElementById("conversation_details_form");
  if (conversationDetailsForm == null) {
    throw new Error("Missing element");
  }

  conversationDetailsForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const nameInput = document.getElementById("name_input");
    if (nameInput == null || !(nameInput instanceof HTMLInputElement)) {
      throw new Error("Missing element");
    }

    const submitButton = document.getElementById("update_conversation_details");
    if (submitButton == null || !(submitButton instanceof HTMLInputElement)) {
      throw new Error("Missing element");
    }

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

      // Update stale data in conversations table
      const conversationName = document.getElementById(`conversation_${conversation.from.S}_name`);
      if (conversationName == null) {
        throw new Error("Missing element");
      }
      conversationName.innerHTML = updatedConversation.name.S;
    });
  });
}

/**
 * @param {string} token
 * @param {Conversation} conversation
 */
function attachNewAppointmentListener(token, conversation) {
  const newAppointmentButton = document.getElementById("new_appointment");
  if (newAppointmentButton == null) {
    throw new Error("Missing element");
  }

  newAppointmentButton.addEventListener("click", function () {
    console.log("TODO");
  })
}

function displayLogin() {
  const content = document.getElementById("content");
  if (content == null) {
    throw new Error("Missing element");
  }

  content.innerHTML = `
  <form id="login_form">
  <div><label>Nome utente</label><input type="text" id="username_input" name="username" /></div>
  <div><label>Password</label><input type="password" id="password_input" name="password" /></div>
  <div><input type="submit" id="login_button" value="Accedi" /></div>
  </form>`;

  attachLoginEventListener();
}

function displayAnonymousLayout() {
  const authenticatedMenu = document.getElementById("authenticated");
  const anonymousMenu = document.getElementById("anonymous");
  if (authenticatedMenu == null || anonymousMenu == null) {
    throw new Error("Missing element");
  }
  authenticatedMenu.style.display = "none";
  anonymousMenu.style.display = "block";

  const title = document.getElementById("title");
  if (title == null) {
    throw new Error("Missing element");
  }
  title.innerHTML = "Filo Diretto";

  const subtitle = document.getElementById("subtitle");
  if (subtitle == null) {
    throw new Error("Missing element");
  }
  subtitle.style.display = "block";
}

/**
 * @param {string} token
 * @param {string} username
 */
function displayAuthenticatedLayout(token, username) {
  const authenticatedMenu = document.getElementById("authenticated");
  const anonymousMenu = document.getElementById("anonymous");
  if (authenticatedMenu == null || anonymousMenu == null) {
    throw new Error("Missing element");
  }
  authenticatedMenu.style.display = "block";
  anonymousMenu.style.display = "none";

  const usernameMenuItem = document.getElementById("username");
  if (usernameMenuItem == null) {
    throw new Error("Missing element");
  }
  usernameMenuItem.innerHTML = username;

  const subtitle = document.getElementById("subtitle");
  if (subtitle == null) {
    throw new Error("Missing element");
  }
  subtitle.style.display = "none";

  attachLogoutEventListener();
  attachConversationsEventListener(token);
  attachCalendarEventListener(token);
}

function attachLoginEventListener() {
  const loginButton = document.getElementById("login_button");
  const loginForm = document.getElementById("login_form");
  if (loginButton == null || !(loginButton instanceof HTMLInputElement) || loginForm == null || !(loginForm instanceof HTMLFormElement)) {
    throw new Error("Missing element");
  }

  loginForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const errorMessage = document.getElementById("error_message");
    if (errorMessage == null) {
      throw new Error("Missing element");
    }
    errorMessage.innerHTML = "";

    const usernameInput = document.getElementById("username_input");
    const passwordInput = document.getElementById("password_input");
    if (usernameInput == null || !(usernameInput instanceof HTMLInputElement) || passwordInput == null || !(passwordInput instanceof HTMLInputElement)) {
      throw new Error("Missing element");
    }

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
  const logoutLink = document.getElementById("logout");
  if (logoutLink == null) {
    throw new Error("Missing element");
  }

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
  const conversationsLink = document.getElementById("conversation_menu_item");
  if (conversationsLink == null) {
    throw new Error("Missing element");
  }

  conversationsLink.addEventListener("click", function (event) {
    event.preventDefault();
    displayConversations(token);
  });
}

/**
 * @param {string} token
 */
function attachCalendarEventListener(token) {
  const calendarLink = document.getElementById("calendar_menu_item");
  if (calendarLink == null) {
    throw new Error("Missing element");
  }

  calendarLink.addEventListener("click", function (event) {
    event.preventDefault();
    displayCalendar(token);
  });
}

/**
 * @typedef {Object} Appointment
 * @prop {{S: string}} from
 * @prop {{S: string}} datetime
 */

/**
 * @param {string} token
 */
function displayCalendar(token) {
  const title = document.getElementById("title");
  if (title == null) {
    throw new Error("Missing element");
  }
  title.innerHTML = "Calendario";

  const content = document.getElementById("content");
  if (content == null) {
    throw new Error("Missing element");
  }
  content.innerHTML = `<p>Caricamento...</p>`;

  const errorMessage = document.getElementById("error_message");
  if (errorMessage == null) {
    throw new Error("Missing element");
  }
  errorMessage.innerHTML = "";

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
    console.log(appointmentsByMonth);
    const sortedMonths = Object.keys(appointmentsByMonth).sort();
    let contentHTML = `
    <div id="calendar">`;
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
        return `
          <tr>
            <td>${element.from.S}</td>
            <td>${date}</td>
            <td>${time}</td>
            <td><button id="appointment_${element.from.S}_info">Dettagli</button></td>
          </tr>`;
      }).join('');
      contentHTML += `
      <h2>${monthName(month)} ${year}</h2>
      <table>
      <thead>
      <tr>
        <th>Numero</th>
        <th>Data</th>
        <th>Ora</th>
        <th>Operazioni</th>
      </tr>
      </thead>
      <tbody>${monthlyAppointments}</tbody>
      </table>`;
    });
    contentHTML += `
    </div>
    <div id="appointment_details">
    </div>`;
    content.innerHTML = contentHTML;

    const calendarTable = document.getElementById("calendar");
    const appointmentDetails = document.getElementById("appointment_details");
    if (calendarTable == null || appointmentDetails == null) {
      throw new Error("Missing element");
    }

    appointmentsResponse.Items.forEach((/** @type {Appointment} */ element) => {
      const infoButton = document.getElementById(`appointment_${element.from.S}_info`);
      if (infoButton == null || !(infoButton instanceof HTMLButtonElement)) {
        throw new Error("Missing element");
      }

      infoButton.addEventListener("click", function (event) {
        calendarTable.style.display = "none";
        appointmentDetails.style.display = "block";
        appointmentDetails.innerHTML = "<p>Caricamento...</p>";

        const params = new URLSearchParams('token=' + token + '&from=' + element.from.S + '&datetime=' + element.datetime.S);
        const request = fetch(APPOINTMENT_URL + '?' + params, {
          method: "GET",
        })
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
  const calendarTable = document.getElementById("calendar");
  const appointmentDetails = document.getElementById("appointment_details");
  if (calendarTable == null || appointmentDetails == null) {
    throw new Error("Missing element");
  }

  appointmentDetails.innerHTML = `
  <h2>Numero: ${appointment.from.S}</h2>
  TODO...
  <p><button id="close_appointment_details" class="primary">Chiudi</button></p>
  `;

  attachCloseAppointmentDetailsListener(calendarTable, appointmentDetails);
}

/**
 * @param {HTMLElement} calendarTable
 * @param {HTMLElement} appointmentDetails
 */
function attachCloseAppointmentDetailsListener(calendarTable, appointmentDetails) {
  const closeAppointmentDetailsButton = document.getElementById("close_appointment_details");
  if (closeAppointmentDetailsButton == null) {
    throw new Error("Missing element");
  }

  closeAppointmentDetailsButton.addEventListener("click", function () {
    calendarTable.style.display = "block";
    appointmentDetails.style.display = "none";
  });
}

/**
 * @param {string} month
 */
function monthName(month) {
  const monthNumber = parseInt(month, 10);
  switch (monthNumber) {
    case 1: return "Gennaio";
    case 2: return "Febbraio";
    case 3: return "Marzo";
    case 4: return "Aprile";
    case 5: return "Maggio";
    case 6: return "Giugno";
    case 7: return "Luglio";
    case 8: return "Agosto";
    case 9: return "Settembre";
    case 10: return "Ottobre";
    case 11: return "Novembre";
    case 12: return "Dicembre";
  }
  throw new Error("Function not implemented.");
}

function main() {
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
