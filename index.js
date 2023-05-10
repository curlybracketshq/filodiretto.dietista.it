//@ts-check

/**
 * @param {string} token
 */
function displayTodaysAppointments(token) {
  const todayElement = requireElement("today");
  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  todayElement.innerText = `📅 Appuntamenti di oggi (${formatDate(now)})`;

  // Load today's appointments
  const appointments = requireElement("todays_appointments");
  appointments.innerHTML = "<p>Caricamento...</p>";

  const isoToday = today.toISOString();
  const tomorrow = new Date(today.getTime() + 60 * 60 * 24 * 1000);
  const isoTomorrow = tomorrow.toISOString();
  const month = isoToday.slice(0, 7);
  const before = isoTomorrow.slice(0, 10);
  const after = isoToday.slice(0, 10);

  /** @type {Appointment[]} */
  let appointmentItems = [];
  fetchAppointments(token, null, { month, before, after }, null, [])
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

      if (appointmentItems.length == 0) {
        appointments.innerHTML = '<p>Nessun appuntamento</p>';
      } else {
        const appointmentsItems = appointmentItems.map((/** @type {Appointment} */ appointment) => {
          const date = new Date(appointment.datetime.S);
          const conversation = conversationItemsByNumber[appointment.from.S];
          if (conversation == null) {
            return '';
          }
          return `
          <li>
            <a href="${appointmentURL(appointment)}">${formatTime(date)}</a>
            -
            <a href="${conversationURL(conversation)}">${fullName(conversation)}</a>
            ${appointment.type?.S != null ? '(' + displayAppointmentType(appointment.type.S) + ')' : ''}
          </li>`;
        }).join('');
        appointments.innerHTML = `<ul>${appointmentsItems}</ul>`;
      }
    });
}

function main() {
  const loading = requireElement("loading");
  loading.style.display = "none";
  const content = requireElement("content");
  content.style.display = "block";

  const authenticatedContent = requireElement("authenticated_content");
  const anonymousContent = requireElement("anonymous_content");

  const token = localStorage.getItem(TOKEN_KEY);
  const username = localStorage.getItem(USERNAME_KEY);
  if (token != null && username != null) {
    const subtitle = requireElement("subtitle");
    subtitle.style.display = "none";
    displayAuthenticatedLayout(username);
    displayTodaysAppointments(token);
    authenticatedContent.style.display = "block";
    anonymousContent.style.display = "none";
  } else {
    displayAnonymousLayout();
    authenticatedContent.style.display = "none";
    anonymousContent.style.display = "block";
  }
}

document.addEventListener("DOMContentLoaded", main);
