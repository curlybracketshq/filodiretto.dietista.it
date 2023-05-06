//@ts-check

const TOKEN_KEY = 'TOKEN';
const USERNAME_KEY = 'USERNAME';

const LOCALE = Intl.DateTimeFormat().resolvedOptions().locale;
console.log('LOCALE', LOCALE);

const LOGIN_URL = "https://08b499nwhf.execute-api.us-east-1.amazonaws.com/default/filoDirettoAuth";
const CONVERSATIONS_URL = "https://08b499nwhf.execute-api.us-east-1.amazonaws.com/default/filoDirettoConversations";
const CONVERSATION_URL = "https://08b499nwhf.execute-api.us-east-1.amazonaws.com/default/filoDirettoConversation";
const APPOINTMENTS_URL = "https://08b499nwhf.execute-api.us-east-1.amazonaws.com/default/filoDirettoAppointments";
const APPOINTMENT_URL = "https://08b499nwhf.execute-api.us-east-1.amazonaws.com/default/filoDirettoAppointment";
const NEXT_APPOINTMENT_URL = "https://08b499nwhf.execute-api.us-east-1.amazonaws.com/default/filoDirettoNextAppointment";
const SEND_APPOINTMENT_REMINDER_URL = "https://08b499nwhf.execute-api.us-east-1.amazonaws.com/default/filoDirettoSendAppointmentReminder";
const MESSAGES_URL = "https://08b499nwhf.execute-api.us-east-1.amazonaws.com/default/filoDirettoMessages";
const SEND_MESSAGE_URL = "https://08b499nwhf.execute-api.us-east-1.amazonaws.com/default/filoDirettoSendMessage";
const AUTOCOMPLETE_MESSAGE_URL = "https://08b499nwhf.execute-api.us-east-1.amazonaws.com/default/filoDirettoAutocompleteMessage";

/**
 * @typedef {Object} Appointment
 * @prop {{S: string}} from
 * @prop {{S: string}} datetime
 * @prop {?{S: string}} type
 * @prop {?{S: string}} reminderSentAt
 */

/**
 * @typedef {Object} Conversation
 * @prop {{S: string}} from
 * @prop {?{S: string}} firstName
 * @prop {?{S: string}} lastName
 * @prop {?{N: string}} height
 * @prop {?{S: string}} notes
 */

/**
 * @typedef {Object} Message
 * @prop {{S: string}} from
 * @prop {{S: string}} timestamp
 * @prop {?{S: string}} text
 * @prop {?{S: string}} source
 */

/**
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) {
  return new Intl.DateTimeFormat(LOCALE, {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

/**
 * @param {Date} date
 * @returns {string}
 */
function formatDateLong(date) {
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: "long",
    month: "long",
    day: "numeric"
  }).format(date);
}

/**
 * @param {Date} date
 * @returns {string}
 */
function formatDateTime(date) {
  return new Intl.DateTimeFormat(LOCALE, {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

/**
 * @param {Date} date
 * @returns {string}
 */
function formatTime(date) {
  return new Intl.DateTimeFormat(LOCALE, {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

/**
 * @param {Date} date
 * @returns {string}
 */
function monthName(date) {
  return new Intl.DateTimeFormat(LOCALE, {
    month: "long",
  }).format(date);
}

/**
 * @param {string} string
 * @returns {string}
 */
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * @param {string} string
 * @returns {string}
 */
function formatPhoneNumber(string) {
  const match = string.match(/(1|39)(\d{3})(\d{3})(\d{3,4})/);
  if (match == null || match.length != 5 || match[0].length != string.length) {
    return string;
  }
  return `+${match[1]} ${match[2]} ${match[3]} ${match[4]}`;
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
 * @param {Appointment} appointment
 * @returns {string}
 */
function appointmentURL(appointment) {
  return `/appointments/#${appointment.from.S}|${appointment.datetime.S}`;
}

/**
 * @param {Conversation} conversation
 * @returns {string}
 */
function conversationURL(conversation) {
  return `/conversations/#${conversation.from.S}`;
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

/**
 * @param {string} token
 * @param {?string} from
 * @param {?{'month': string, 'before': string, 'after': string}} monthBeforeAfter
 * @param {?string} lastEvaluatedKey
 * @param {Array<Appointment>} items
 * @returns {Promise<Array<Appointment>>}
 */
function fetchAppointments(token, from, monthBeforeAfter, lastEvaluatedKey, items) {
  let queryString = 'token=' + token;
  if (from != null && monthBeforeAfter != null) {
    throw new Error("Too many query parameters");
  }
  if (from != null) {
    queryString += '&from=' + from;
  }
  if (monthBeforeAfter != null) {
    queryString += '&month=' + monthBeforeAfter.month;
    queryString += '&before=' + monthBeforeAfter.before;
    queryString += '&after=' + monthBeforeAfter.after;
  }
  if (lastEvaluatedKey != null) {
    queryString += '&last_evaluated_key=' + lastEvaluatedKey;
  }
  const params = new URLSearchParams(queryString);
  const request = fetch(APPOINTMENTS_URL + '?' + params, {
    method: "GET",
  });
  return handleFetchGenericError(request)
    .then(handleFetchAuthError)
    .then(([_error, success]) => {
      if (success == null) {
        return [];
      }

      const response = JSON.parse(success.content);
      items = items.concat(response.Items);
      if (response.LastEvaluatedKey == null) {
        return items;
      }
      const lastEvaluatedKey = JSON.stringify(response.LastEvaluatedKey);
      return fetchAppointments(token, from, monthBeforeAfter, lastEvaluatedKey, items);
    });
}

/**
 * @param {string} token
 * @param {?string} from
 * @param {?string} lastEvaluatedKey
 * @param {Array<Message>} items
 * @returns {Promise<Array<Message>>}
 */
function fetchMessages(token, from, lastEvaluatedKey, items) {
  let queryString = 'token=' + token;
  if (from != null) {
    queryString += '&from=' + from;
  }
  if (lastEvaluatedKey != null) {
    queryString += '&last_evaluated_key=' + lastEvaluatedKey;
  }
  const params = new URLSearchParams(queryString);
  const request = fetch(MESSAGES_URL + '?' + params, {
    method: "GET",
  });
  return handleFetchGenericError(request)
    .then(handleFetchAuthError)
    .then(([_error, success]) => {
      if (success == null) {
        return [];
      }

      const response = JSON.parse(success.content);
      items = items.concat(response.Items);
      if (response.LastEvaluatedKey == null) {
        return items;
      }
      const lastEvaluatedKey = JSON.stringify(response.LastEvaluatedKey);
      return fetchMessages(token, from, lastEvaluatedKey, items);
    });
}

/**
 * @param {string} token
 * @param {?string} lastEvaluatedKey
 * @param {Array<Conversation>} items
 * @returns {Promise<Array<Conversation>>}
 */
function fetchConversations(token, lastEvaluatedKey, items) {
  let queryString = 'token=' + token;
  if (lastEvaluatedKey != null) {
    queryString += '&last_evaluated_key=' + lastEvaluatedKey;
  }
  const params = new URLSearchParams(queryString);
  const request = fetch(CONVERSATIONS_URL + '?' + params, {
    method: "GET",
  });
  return handleFetchGenericError(request)
    .then(handleFetchAuthError)
    .then(([_error, success]) => {
      if (success == null) {
        return [];
      }

      const conversationsResponse = JSON.parse(success.content);
      items = items.concat(conversationsResponse.Items);
      if (conversationsResponse.LastEvaluatedKey == null) {
        return items;
      }
      const lastEvaluatedKey = JSON.stringify(conversationsResponse.LastEvaluatedKey);
      return fetchConversations(token, lastEvaluatedKey, items);
    });
}

/**
 * Sanitize and encode all HTML in a user-submitted string
 * @param {String} str
 * @return {String}
 */
function sanitizeHTML(str) {
  return [...str].map(function (c) {
		return '&#' + c.codePointAt(0) + ';';
	}).join('');
};

/**
 * @param {any} appointmentType
 * @returns {?string}
 */
function displayAppointmentType(appointmentType) {
  switch (appointmentType) {
    case "control": return "Controllo";
    case "first_visit": return "Prima visita";
    case "iris": return "Iri";
    case "bioimpedance": return "Bioimpedenza";
    case "integration": return "Int. alim";
    case "bach": return "Fiori B";
  }

  return null;
}

/**
 * @param {Conversation} conversation
 * @returns {string}
 */
function fullName(conversation) {
  return [
    conversation.firstName?.S,
    conversation.lastName?.S
  ].filter(s => s != null && s != '')
    .join(' ');
}

/**
 * @param {number} n
 * @param {string} s
 * @param {string} p
 * @returns {string}
 */
function plural(n, s, p) {
  return n == 1 ? s : p;
}

/**
 * @param {number} n
 * @param {string} s
 * @param {string} p
 * @returns {string}
 */
function pluralN(n, s, p) {
  return `${n} ${plural(n, s, p)}`;
}
