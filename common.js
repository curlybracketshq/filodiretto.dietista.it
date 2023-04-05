//@ts-check

const TOKEN_KEY = 'TOKEN';
const USERNAME_KEY = 'USERNAME';

const LOGIN_URL = "https://08b499nwhf.execute-api.us-east-1.amazonaws.com/default/filoDirettoAuth";
const CONVERSATIONS_URL = "https://08b499nwhf.execute-api.us-east-1.amazonaws.com/default/filoDirettoConversations";
const CONVERSATION_URL = "https://08b499nwhf.execute-api.us-east-1.amazonaws.com/default/filoDirettoConversation";
const APPOINTMENTS_URL = "https://08b499nwhf.execute-api.us-east-1.amazonaws.com/default/filoDirettoAppointments";
const APPOINTMENT_URL = "https://08b499nwhf.execute-api.us-east-1.amazonaws.com/default/filoDirettoAppointment";
const NEXT_APPOINTMENT_URL = "https://08b499nwhf.execute-api.us-east-1.amazonaws.com/default/filoDirettoNextAppointment";
const SEND_APPOINTMENT_REMINDER_URL = "https://08b499nwhf.execute-api.us-east-1.amazonaws.com/default/filoDirettoSendAppointmentReminder";
const MESSAGES_URL = "https://08b499nwhf.execute-api.us-east-1.amazonaws.com/default/filoDirettoMessages";

/**
 * @typedef {Object} Appointment
 * @prop {{S: string}} from
 * @prop {{S: string}} datetime
 * @prop {?{S: string}} reminderSentAt
 */

/**
 * @typedef {Object} Conversation
 * @prop {{S: string}} from
 * @prop {?{S: string}} firstName
 * @prop {?{S: string}} lastName
 * @prop {?{S: string}} notes
 */

/**
 * @typedef {Object} Message
 * @prop {{S: string}} from
 * @prop {{S: string}} timestamp
 * @prop {?{S: string}} text
 */

/**
 * @param {number} month
 * @returns {string}
 */
function monthName(month) {
  switch (month) {
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
  throw new Error("Unexpected input: " + month);
}

/**
 * @param {number} weekday
 * @returns {string}
 */
function weekdayName(weekday) {
  switch (weekday) {
    case 0: return 'Domenica';
    case 1: return 'Lunedì';
    case 2: return 'Martedì';
    case 3: return 'Mercoledì';
    case 4: return 'Giovedì';
    case 5: return 'Venerdì';
    case 6: return 'Sabato';
  }
  throw new Error("Unexpected input: " + weekday);
}

/**
 * @param {Date} date
 * @returns {string}
 */
function dateToString(date) {
  const weekday = date.getUTCDay();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();

  return `${weekdayName(weekday)} ${day} ${monthName(month)}`.toLowerCase();
}

/**
 * @param {any} id
 * @returns {HTMLElement}
 */
function requireElement(id) {
  const element = document.getElementById(id);
  if (element == null) {
    throw new Error("Missing element");
  }
  return element;
}

/**
 * @param {any} id
 * @returns {HTMLAnchorElement}
 */
function requireAnchorElement(id) {
  const element = document.getElementById(id);
  if (element == null || !(element instanceof HTMLAnchorElement)) {
    throw new Error("Missing anchor element");
  }
  return element;
}

/**
 * @param {any} id
 * @returns {HTMLInputElement}
 */
function requireInputElement(id) {
  const element = document.getElementById(id);
  if (element == null || !(element instanceof HTMLInputElement)) {
    throw new Error("Missing input element");
  }
  return element;
}

/**
 * @param {any} id
 * @returns {HTMLTextAreaElement}
 */
function requireTextAreaElement(id) {
  const element = document.getElementById(id);
  if (element == null || !(element instanceof HTMLTextAreaElement)) {
    throw new Error("Missing textarea element");
  }
  return element;
}

/**
 * @param {any} id
 * @returns {HTMLSelectElement}
 */
function requireSelectElement(id) {
  const element = document.getElementById(id);
  if (element == null || !(element instanceof HTMLSelectElement)) {
    throw new Error("Missing select element");
  }
  return element;
}

/**
 * @param {any} id
 * @returns {HTMLButtonElement}
 */
function requireButtonElement(id) {
  const element = document.getElementById(id);
  if (element == null || !(element instanceof HTMLButtonElement)) {
    throw new Error("Missing button element");
  }
  return element;
}

/**
 * @param {string} username
 */
function displayAuthenticatedLayout(username) {
  const authenticatedMenu = requireElement("authenticated");
  authenticatedMenu.style.display = "flex";

  const anonymousMenu = requireElement("anonymous");
  anonymousMenu.style.display = "none";

  const usernameMenuItem = requireElement("username");
  usernameMenuItem.innerHTML = username;

  const logoutLink = requireElement("logout");
  logoutLink.addEventListener("click", function (event) {
    event.preventDefault();
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USERNAME_KEY);
    window.location.replace("/");
  });
}

function displayAnonymousLayout() {
  const authenticatedMenu = requireElement("authenticated");
  authenticatedMenu.style.display = "none";

  const anonymousMenu = requireElement("anonymous");
  anonymousMenu.style.display = "flex";
}

/**
 * @param {Promise<Response>} promise
 * @returns {Promise<[?{status: number, content: string}, ?{status: number, content: string}]>}
 */
function handleFetchGenericError(promise) {
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

/**
 * @param {[?{status: number, content: string}, ?{status: number, content: string}]} result
 * @returns {[?{status: number, content: string}, ?{status: number, content: string}]}
 */
function handleFetchAuthError([error, success]) {
  if (error != null && error.status == 401) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USERNAME_KEY);
    window.location.replace("/");
  }

  return [error, success];
}