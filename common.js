//@ts-check

const TOKEN_KEY = 'TOKEN';
const USERNAME_KEY = 'USERNAME';

const LOCALE = Intl.DateTimeFormat().resolvedOptions().locale;
console.log('LOCALE', LOCALE);

const ROOT_URL = "https://08b499nwhf.execute-api.us-east-1.amazonaws.com/default";

const LOGIN_URL = ROOT_URL + "/filoDirettoAuth";
const CONVERSATIONS_URL = ROOT_URL + "/filoDirettoConversations";
const CONVERSATION_URL = ROOT_URL + "/filoDirettoConversation";
const APPOINTMENTS_URL = ROOT_URL + "/filoDirettoAppointments";
const APPOINTMENT_URL = ROOT_URL + "/filoDirettoAppointment";
const NEXT_APPOINTMENT_URL = ROOT_URL + "/filoDirettoNextAppointment";
const SEND_APPOINTMENT_REMINDER_URL = ROOT_URL + "/filoDirettoSendAppointmentReminder";
const MESSAGES_URL = ROOT_URL + "/filoDirettoMessages";
const SEND_MESSAGE_URL = ROOT_URL + "/filoDirettoSendMessage";
const AUTOCOMPLETE_MESSAGE_URL = ROOT_URL + "/filoDirettoAutocompleteMessage";

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
 * @prop {?{S: string}} email
 * @prop {?{N: string}} height
 * @prop {?{S: string}} birthDate
 * @prop {?{S: string}} gender
 * @prop {?{S: string}} notes
 * @prop {?{S: string}} privacy
 * @prop {?{S: string}} weights
 * @prop {?{S: string}} waistHips
 */

/**
 * @typedef {Object} WeightItem
 * @prop {string} date
 * @prop {number} value
 */

/**
 * @typedef {Object} WaistHipItem
 * @prop {string} date
 * @prop {number} waist
 * @prop {number} hip
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
 * @param {ReadableStream<Uint8Array>} stream
 * @returns {Promise<string>}
 */
function fetchStream(stream) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();

  // read() returns a promise that resolves
  // when a value has been received
  return reader.read().then(
    /**
     * @param {ReadableStreamReadResult<Uint8Array>} readResult
     * @returns {Promise<string> | string}
     */
    function processText({ done, value }) {
      // Result objects contain two properties:
      // done  - true if the stream has already given you all its data.
      // value - some data. Always undefined when done is true.
      if (done) {
        return '';
      }

      // Read some more, and call this function again
      return reader.read()
        .then(processText)
        .then(s => decoder.decode(value) + s);
    });
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
      return fetchStream(res.body)
        .then(content => ({ status: res.status, content }));
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
 * @param {function(): void} callback
 * @returns {function([?{status: number, content: string}, ?{status: number, content: string}]): [?{status: number, content: string}, ?{status: number, content: string}]}
 */
function always(callback) {
  return ([error, success]) => {
    callback();
    return [error, success];
  }
}

/**
 * @param {function({status: number, content: string}): void} callback
 * @returns {function([?{status: number, content: string}, ?{status: number, content: string}]): [?{status: number, content: string}, ?{status: number, content: string}]}
 */
function onSuccess(callback) {
  return ([error, success]) => {
    if (error != null) {
      return [error, success];
    }

    if (success == null) {
      throw new Error("Success can't be null");
    }

    callback(success);
    return [error, success];
  }
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
  let queryString = 'token=' + encodeURIComponent(token);
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
  let queryString = 'token=' + encodeURIComponent(token);
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
 * @param {?Array<string>} fields
 * @param {?string} lastEvaluatedKey
 * @param {Array<Conversation>} items
 * @returns {Promise<Array<Conversation>>}
 */
function fetchConversations(token, fields, lastEvaluatedKey, items) {
  let queryString = 'token=' + encodeURIComponent(token);
  if (lastEvaluatedKey != null) {
    queryString += '&last_evaluated_key=' + lastEvaluatedKey;
  }
  if (fields != null) {
    queryString += '&fields=' + fields.join(',');
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
      return fetchConversations(token, fields, lastEvaluatedKey, items);
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

/**
 * @param {Conversation[]} items
 * @returns {Conversation[]}
 */
function sortConversations(items) {
  return items
    .sort((a, b) => {
      const aLastName = a.lastName?.S ?? '';
      const bLastName = b.lastName?.S ?? '';
      if (aLastName < bLastName) {
        return -1;
      } else if (aLastName > bLastName) {
        return 1;
      } else {
        const aFirstName = a.firstName?.S ?? '';
        const bFirstName = b.firstName?.S ?? '';
        if (aFirstName < bFirstName) {
          return -1;
        } else if (aFirstName > bFirstName) {
          return 1;
        } else {
          return 0;
        }
      }
    })
}

/**
 * @returns {{token: string, username: string}?}
 */
function requireAuth() {
  const token = localStorage.getItem(TOKEN_KEY);
  const username = localStorage.getItem(USERNAME_KEY);

  if (token != null && username != null) {
    return {token, username};
  }

  const redirectTo = encodeURIComponent(window.location.href);
  window.location.replace(`/login/#${redirectTo}`);
  return null;
}