//@ts-check

/**
 * @param {string} token
 * @param {string} from
 * @param {string} datetime
 */
function displayAppointmentDetails(token, from, datetime) {
  const title = requireElement("title");
  const dateObj = new Date(datetime);
  title.innerHTML = `📅 Appuntamento ${formatDateTime(dateObj)}`;

  const loading = requireElement("loading");
  loading.style.display = "block";

  const params = new URLSearchParams('token=' + encodeURIComponent(token) + '&from=' + from + '&datetime=' + datetime);
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
      /** @type {Appointment} */
      const appointment = appointmentDetailsResponse.Item;

      const from = requireAnchorElement("from");
      from.innerHTML = appointment.from.S;
      from.href = `/conversations/#${appointment.from.S}`;

      const appointmentType = requireElement("appointment_type");
      appointmentType.innerText = displayAppointmentType(appointment.type?.S) ?? 'non specificato';

      const reminderSentAt = requireElement("reminder_sent_at");
      let reminderSentAtStr = "non inviato";
      if (appointment.reminderSentAt != null) {
        const date = new Date(appointment.reminderSentAt.S + ':00Z');
        reminderSentAtStr = `inviato il ${formatDateTime(date)}`;
      }
      reminderSentAt.innerText = reminderSentAtStr;

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

    if (appointment.reminderSentAt != null) {
      const reminderSentAtDate = new Date(appointment.reminderSentAt.S + ':00Z');
      const confirmMessage = `Hai già inviato un promemoria in data ${formatDateTime(reminderSentAtDate)}.\nVuoi inviare un altro promemoria?`;
      if (!confirm(confirmMessage)) {
        return;
      }
    }

    const dateObj = new Date(appointment.datetime.S);
    const date = formatDateLong(dateObj);
    const time = formatTime(dateObj);
    sendButton.disabled = true;
    sendButton.innerHTML = "Caricamento...";

    const request = fetch(SEND_APPOINTMENT_REMINDER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        appointment: {
          from: appointment.from.S,
          datetime: appointment.datetime.S,
          type: appointment.type?.S
        },
        message: { to: appointment.from.S, date, time }
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

        const reminderSentAt = requireElement("reminder_sent_at");
        const date = new Date();
        reminderSentAt.innerText = `inviato il ${formatDateTime(date)}`;
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

    const params = new URLSearchParams('token=' + encodeURIComponent(token) + '&from=' + appointment.from.S + '&datetime=' + appointment.datetime.S);
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
  const auth = requireAuth();
  if (auth == null) {
    return;
  }
  const {token, username} = auth;
  displayAuthenticatedLayout(username);
  if (location.hash == "") {
    window.location.replace("/calendar/");
  } else {
    const [_, id] = location.hash.split('#');
    const [from, datetime] = id.split('|');
    displayAppointmentDetails(token, from, datetime);
  }
}

document.addEventListener("DOMContentLoaded", main);

function hashChange() {
  const auth = requireAuth();
  if (auth == null) {
    return;
  }
  const {token} = auth;
  if (location.hash == "") {
    window.location.replace("/calendar/");
  } else {
    const [_, id] = location.hash.split('#');
    const [from, datetime] = id.split('|');
    displayAppointmentDetails(token, from, datetime);
  }
}

window.addEventListener("hashchange", hashChange);