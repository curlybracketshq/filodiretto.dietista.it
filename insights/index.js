//@ts-check

/**
 * @param {string} token
 * @param {{start: Date, end: Date}} timeRange
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
  const responses = requests.map(request => fetchAppointments(token, null, request, null, []));
  Promise.all(responses)
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

      intro.innerText = `La scorsa settimana hai avuto ${pluralN(appointmentItems.length, "appuntamento", "appuntamenti")} dove hai incontrato ${pluralN(Object.keys(appointmentsByNumber).length, "persona", "persone diverse")}.`;

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
    displayConversations(token, { start: beginningOfWeek, end: endOfWeek });
  } else {
    window.location.replace("/login/");
  }
}

document.addEventListener("DOMContentLoaded", main);
