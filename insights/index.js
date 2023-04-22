//@ts-check

/**
 * @param {string} token
 * @param {{start: Date, end: Date}} timeRange
 * @returns {Promise<{appointmentsByNumber: Object.<string, Appointment[]>, conversationItemsByNumber: Object.<string, Conversation>}>}
 */
function displayConversations(token, { start, end }) {
  // Load week's appointments
  const intro = requireElement("intro");
  intro.innerText = "Caricamento...";
  const conversations = requireElement("conversations");
  conversations.innerHTML = "<p>Caricamento...</p>";

  const startUTC = new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate()));
  const endUTC = new Date(Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()));
  const startISODate = startUTC.toISOString().slice(0, 10);
  const endISODate = endUTC.toISOString().slice(0, 10);

  let requests = [{
    month: startISODate.slice(0, 7),
    before: endISODate,
    after: startISODate,
  }];
  // If start and end dates fall in different months send two requests
  if (start.getMonth() != end.getMonth()) {
    requests.push({
      month: endISODate.slice(0, 7),
      before: endISODate,
      after: startISODate,
    });
  }

  /** @type {Appointment[]} */
  let appointmentItems = [];
  const promises = requests.map(request => fetchAppointments(token, null, request, null, []));
  return Promise.all(promises)
    .then(responses => responses.reduce((acc, items) => acc.concat(items), []))
    .then(items => {
      appointmentItems = items;

      if (items.length == 0) {
        return [];
      }

      return fetchConversations(token, null, []);
    })
    .then(conversationItems => {
      const conversationItemsByNumber = conversationItems.reduce(function (/** @type {Object.<string, Conversation>} */ acc, conversation) {
        acc[conversation.from.S] = conversation;
        return acc;
      }, {});

      const appointmentsByNumber = appointmentItems.reduce(function (/** @type {Object.<string, Appointment[]>} */ acc, appointment) {
        if (acc[appointment.from.S] != null) {
          acc[appointment.from.S].push(appointment);
        } else {
          acc[appointment.from.S] = [appointment];
        }
        return acc;
      }, {});

      intro.innerHTML = `
      La scorsa settimana hai avuto
      <strong>${pluralN(appointmentItems.length, "appuntamento", "appuntamenti")}</strong>
      dove hai incontrato
      <strong>${pluralN(Object.keys(appointmentsByNumber).length, "persona", "persone diverse")}</strong>.`;

      if (appointmentItems.length == 0) {
        conversations.innerHTML = '<p>Nessun contatto</p>';
      } else {
        const listItems = Object.keys(appointmentsByNumber).map((/** @type {string} */ number) => {
          const conversation = conversationItemsByNumber[number];
          return `
          <li>
            <a href="/conversations/#${conversation.from.S}">${fullName(conversation)}</a>
          </li>`;
        }).join('');
        conversations.innerHTML = `<ul>${listItems}</ul>`;
      }

      return { appointmentsByNumber, conversationItemsByNumber };
    });
}

/**
 * @param {string} token
 * @param {Object.<string, Appointment[]>} appointmentsByNumber
 * @param {Object.<string, Conversation>} conversationItemsByNumber
 */
function displayMissingFollowUps(token, appointmentsByNumber, conversationItemsByNumber) {
  const missingFollowUpsIntro = requireElement("missing_follow_ups_intro");
  missingFollowUpsIntro.innerText = "Caricamento...";

  const missingFollowUps = requireElement("missing_follow_ups");


  const numbers = Object.keys(appointmentsByNumber)
  /** @type {Promise<?Appointment>[]} */
  const promises = numbers.map(number => {
    const nextAppointmentParams = new URLSearchParams('token=' + token + '&from=' + number);
    const nextAppointmentRequest = fetch(NEXT_APPOINTMENT_URL + '?' + nextAppointmentParams, {
      method: "GET",
    });
    return handleFetchGenericError(nextAppointmentRequest)
      .then(handleFetchAuthError)
      .then(([_error, success]) => {
        if (success == null) {
          return null;
        }

        const appointmentDetailsResponse = JSON.parse(success.content);
        if (appointmentDetailsResponse.Items.length == 0) {
          return null;
        } else {
          return appointmentDetailsResponse.Items[0];
        }
      });
  });

  Promise.all(promises)
    .then(nextAppointments => {
      if (nextAppointments.filter(appointment => appointment != null).length == numbers.length) {
        missingFollowUpsIntro.innerText = "Tutte le persone che hai incontrato la scorsa settimana hanno in programma un appuntamento futuro.";
      } else {
        missingFollowUpsIntro.innerText = "Alcune delle persone che hai incontrato la scorsa settimana non hanno in programma nessun appuntamento futuro.";
      }

      if (numbers.length == 0) {
        return;
      }

      const listItems = nextAppointments.map((appointment, i) => {
        const conversation = conversationItemsByNumber[numbers[i]];
        let nextAppointmentStr;
        if (appointment == null) {
          nextAppointmentStr = "- Nessun appuntamento futuro";
        } else {
          const dateObj = new Date(appointment.datetime.S);
          nextAppointmentStr = `
          - Prossimo appuntamento:
          <a href="/appointments/#${appointment.from.S}|${appointment.datetime.S}">${formatDateTime(dateObj)}</a>`;
        }

        return `
        <li>
          <a href="/conversations/#${conversation.from.S}">${fullName(conversation)}</a>
          ${nextAppointmentStr}
        </li>`;
      }).join('');
      missingFollowUps.innerHTML = `<ul>${listItems}</ul>`;
    });
}

function main() {
  const loading = requireElement("loading");
  loading.style.display = "none";
  const content = requireElement("content");
  content.style.display = "block";

  const token = localStorage.getItem(TOKEN_KEY);
  const username = localStorage.getItem(USERNAME_KEY);
  if (token != null && username != null) {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const beginningOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7 - dayOfWeek);
    const endOfWeek = new Date(beginningOfWeek.getTime() + 60 * 60 * 24 * 7 * 1000);
    // For the sake of clarity display the week as [sunday, saturday] rather than [sunday, sunday + 7)
    const endOfWeekForDisplay = new Date(beginningOfWeek.getTime() + 60 * 60 * 24 * 6 * 1000);
    const subtitle = requireElement("subtitle");
    subtitle.innerText = `Settimana dal ${formatDate(beginningOfWeek)} al ${formatDate(endOfWeekForDisplay)}`;
    subtitle.style.display = "block";

    displayAuthenticatedLayout(username);
    displayConversations(token, { start: beginningOfWeek, end: endOfWeek })
      .then(({ appointmentsByNumber, conversationItemsByNumber }) => {
        displayMissingFollowUps(token, appointmentsByNumber, conversationItemsByNumber);
      });
  } else {
    window.location.replace("/login/");
  }
}

document.addEventListener("DOMContentLoaded", main);
