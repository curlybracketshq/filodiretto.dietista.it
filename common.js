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
 * @returns {HTMLButtonElement}
 */
function requireButtonElement(id) {
  const element = document.getElementById(id);
  if (element == null || !(element instanceof HTMLButtonElement)) {
    throw new Error("Missing button element");
  }
  return element;
}