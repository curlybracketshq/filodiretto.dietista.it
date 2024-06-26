//@ts-check

/**
 * @param {string} token
 */
function displayCreateAppointment(token) {
  const loading = requireElement("loading");
  loading.style.display = "block";

  fetchConversations(token, ['firstName', 'lastName'], null, [])
    .then(items => {
      const loading = requireElement("loading");
      loading.style.display = "none";
      const content = requireElement("content");
      content.style.display = "block";

      let preselected = "";
      if (location.hash != "") {
        const [_, preselectedInput] = location.hash.split('#');
        preselected = preselectedInput;
      }

      let conversationOptions = `<option value="">Seleziona numero</option>`;
      conversationOptions += sortConversations(items).map(element => {
        return `
        <option value="${element.from.S}" ${preselected == element.from.S ? 'selected' : ''}>
          ${fullName(element)} (${formatPhoneNumber(element.from.S)})
        </option>`;
      }).join('');
      const fromSelect = requireElement("from_select");
      fromSelect.innerHTML = conversationOptions;

      const datetimeInput = requireInputElement("datetime_input");
      datetimeInput.value = new Date().toISOString().slice(0, -9) + '0';

      attachCreateAppointmentListener(token);
    });
}

/**
 * @param {string} token
 */
function attachCreateAppointmentListener(token) {
  const submitButton = requireInputElement("create_appointment");
  const form = requireElement("new_appointment_form");

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    const fromSelect = requireSelectElement("from_select");
    const datetimeInput = requireInputElement("datetime_input");
    const appointmentTypeSelect = requireSelectElement("appointment_type_select");
    const reminderSentInput = requireInputElement("reminder_sent_input");

    if (fromSelect.value == '') {
      throw new Error("Invalid from value");
    }

    submitButton.disabled = true;
    submitButton.value = "Caricamento...";

    const request = fetch(APPOINTMENT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        appointment: {
          from: fromSelect.value,
          datetime: datetimeInput.value,
          appointment_type: appointmentTypeSelect.value,
          reminder_sent: reminderSentInput.checked
        }
      })
    });
    handleFetchGenericError(request)
      .then(handleFetchAuthError)
      .then(([_error, success]) => {
        submitButton.disabled = false;
        submitButton.value = "Crea";

        if (success == null) {
          return;
        }

        const result = JSON.parse(success.content);
        console.log(result);
        window.location.replace(`/appointments/#${fromSelect.value}|${datetimeInput.value}`);
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
  displayCreateAppointment(token);
}

document.addEventListener("DOMContentLoaded", main);
