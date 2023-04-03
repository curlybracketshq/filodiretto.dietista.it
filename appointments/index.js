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
    window.location.replace("/login/");
  });
}

/**
 * @param {string} token
 * @param {string} from
 * @param {string} datetime
 */
function displayAppointmentDetails(token, from, datetime) {
  const title = requireElement("title");
  const [date, time] = datetime.split('T');
  const dateObj = new Date(date);
  const month = dateObj.getUTCMonth() + 1;
  const day = dateObj.getUTCDate();
  title.innerHTML = `Appuntamento del ${day} ${monthName(month).toLowerCase()} alle ${time}`;

  const loading = requireElement("loading");
  loading.style.display = "block";

  const params = new URLSearchParams('token=' + token + '&from=' + from + '&datetime=' + datetime);
  const request = fetch(APPOINTMENT_URL + '?' + params, {
    method: "GET",
  });
  handleFetchResponseError(request).then(([_error, success]) => {
    if (success == null) {
      return;
    }

    const loading = requireElement("loading");
    loading.style.display = "none";
    const appointmentDetails = requireElement("appointment_details");
    appointmentDetails.style.display = "block";
    const content = requireElement("content");
    content.style.display = "block";

    const appointmentDetailsResponse = JSON.parse(success.content);
    const appointment = appointmentDetailsResponse.Item;
    const from = requireElement("from");
    from.innerHTML = appointment.from.S;
    const reminderSentAt = requireElement("reminder_sent_at");
    reminderSentAt.innerHTML = appointment.reminderSentAt == null ? 'non inviato' : `inviato il ${appointment.reminderSentAt.S}`;
    attachSendAppointmentReminderListener(token, appointment);
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

      const infoMessage = requireElement("info_message");
      infoMessage.innerHTML = "Promemoria inviato correttamente";
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
      window.location.replace("/calendar/");
    } else {
      const [_, id] = location.hash.split('#');
      const [from, datetime] = id.split('|');
      displayAppointmentDetails(token, from, datetime);
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
      window.location.replace("/calendar/");
    } else {
      const [_, id] = location.hash.split('#');
      const [from, datetime] = id.split('|');
      displayAppointmentDetails(token, from, datetime);
    }
  } else {
    window.location.replace("/login/");
  }
}

window.addEventListener("hashchange", hashChange);