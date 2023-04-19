//@ts-check

/**
 * @param {string} token
 */
function displayTodaysAppointments(token) {
  const todayElement = requireElement("today");
  const today = new Date();
  const formattedDate = new Intl.DateTimeFormat("it-IT", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(today);
  todayElement.innerText = `📅 Appuntamenti di oggi (${formattedDate})`;

  // Load today's appointments
  const appointments = requireElement("todays_appointments");
  appointments.innerHTML = "<p>Caricamento...</p>";

  const isoToday = today.toISOString();
  const tomorrow = new Date(today.getTime() + 60 * 60 * 24 * 1000);
  const isoTomorrow = tomorrow.toISOString();
  const month = isoToday.slice(0, 7);
  const before = isoTomorrow.slice(0, 10);
  const after = isoToday.slice(0, 10);
  fetchAppointments(token, null, { month, before, after }, null, [])
    .then(items => {
      if (items.length == 0) {
        appointments.innerHTML = '<p>Nessun appuntamento</p>';
      } else {
        const appointmentsItems = items.map((/** @type {Appointment} */ appointment) => {
          const [_date, time] = appointment.datetime.S.split('T');
          return `<li><a href="/appointments/#${appointment.from.S}|${appointment.datetime.S}">${time}</a> - <a href="/conversations/#${appointment.from.S}">${appointment.from.S}</a></li>`;
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
