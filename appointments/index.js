//@ts-check

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
  handleFetchGenericError(request)
    .then(handleFetchAuthError)
    .then(([_error, success]) => {
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
      const from = requireAnchorElement("from");
      from.innerHTML = appointment.from.S;
      from.href = `/conversations/#${appointment.from.S}`;
      const reminderSentAt = requireElement("reminder_sent_at");
      reminderSentAt.innerHTML = appointment.reminderSentAt == null ? 'non inviato' : `inviato il ${appointment.reminderSentAt.S}`;
      attachSendAppointmentReminderListener(token, appointment);
      attachDeleteAppointmentListener(token, appointment);
    });
}

/**
 * @param {string} token
 * @param {Appointment} appointment
 */
function attachSendAppointmentReminderListener(token, appointment) {
  const sendButton = requireButtonElement("send_appointment_reminder");
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
    sendButton.innerHTML = "Caricamento...";

    const request = fetch(SEND_APPOINTMENT_REMINDER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        appointment: { from: appointment.from.S, datetime: appointment.datetime.S },
        message: { to: appointment.from.S, date: dateStr, time }
      })
    });
    handleFetchGenericError(request)
      .then(handleFetchAuthError)
      .then(([error, success]) => {
        sendButton.disabled = false;
        sendButton.innerHTML = "Invia promemoria";

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


/**
 * @param {string} token
 * @param {Appointment} appointment
 */
function attachDeleteAppointmentListener(token, appointment) {
  const deleteAppointmentButton = requireButtonElement("delete_appointment");
  deleteAppointmentButton.addEventListener("click", function () {
    if (!confirm(`Vuoi eliminare questo appuntamento?`)) {
      return;
    }

    deleteAppointmentButton.disabled = true;
    deleteAppointmentButton.innerHTML = "Caricamento...";

    const params = new URLSearchParams('token=' + token + '&from=' + appointment.from.S + '&datetime=' + appointment.datetime.S);
    const request = fetch(APPOINTMENT_URL + '?' + params, {
      method: "DELETE",
    });
    handleFetchGenericError(request)
      .then(handleFetchAuthError)
      .then(([_error, success]) => {
        deleteAppointmentButton.disabled = false;
        deleteAppointmentButton.innerHTML = "Elimina";

        if (success == null) {
          return;
        }

        window.location.replace("/calendar/");
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