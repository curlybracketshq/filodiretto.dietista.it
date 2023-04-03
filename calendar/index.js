//@ts-check

const APPOINTMENTS_URL = "https://08b499nwhf.execute-api.us-east-1.amazonaws.com/default/filoDirettoAppointments";

/**
 * @typedef {Object} Appointment
 * @prop {{S: string}} from
 * @prop {{S: string}} datetime
 * @prop {?{S: string}} reminderSentAt
 */

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
 */
function displayCalendar(token) {
  const loading = requireElement("loading");
  loading.style.display = "block";

  const params = new URLSearchParams('token=' + token);
  const request = fetch(APPOINTMENTS_URL + '?' + params, {
    method: "GET",
  });
  handleFetchResponseError(request).then(([_error, success]) => {
    if (success == null) {
      return;
    }

    const loading = requireElement("loading");
    loading.style.display = "none";
    const calendar = requireElement("calendar");
    calendar.style.display = "block";
    const content = requireElement("content");
    content.style.display = "block";

    const appointmentsResponse = JSON.parse(success.content);
    const appointmentsByMonth = appointmentsResponse.Items.reduce(function (/** @type {Object.<string, Appointment[]>} */ collection, /** @type {Appointment} */ element) {
      const [date, _time] = element.datetime.S.split('T');
      const [year, month, _day] = date.split('-');
      const yearMonth = `${year}-${month}`;
      if (yearMonth in collection) {
        collection[yearMonth].push(element);
      } else {
        collection[yearMonth] = [element];
      }
      return collection;
    }, {});
    const sortedMonths = Object.keys(appointmentsByMonth).sort();
    calendar.innerHTML = sortedMonths.map((/** @type {string} */ yearMonth) => {
      const [year, month] = yearMonth.split('-');
      const monthlyAppointments = appointmentsByMonth[yearMonth].sort(function (/** @type {{ datetime: { S: number; }; }} */ a, /** @type {{ datetime: { S: number; }; }} */ b) {
        if (a.datetime.S < b.datetime.S) {
          return -1;
        }
        if (a.datetime.S > b.datetime.S) {
          return 1;
        }
        return 0;
      }).map(function (/** @type {Appointment} */ element) {
        const [date, time] = element.datetime.S.split('T');
        const dateObj = new Date(date);
        const weekday = dateObj.getUTCDay();
        const day = dateObj.getUTCDate();
        return `
          <tr>
            <td>${weekdayName(weekday)} ${day}</td>
            <td>${time}</td>
            <td>${element.from.S}</td>
            <td><a href="/appointments/#${element.from.S}:${element.datetime.S}">Dettagli</a></td>
          </tr>`;
      }).join('');

      return `
      <h2>${monthName(parseInt(month, 10))} ${year}</h2>
      <table>
      <thead>
      <tr>
        <th>Data</th>
        <th>Ora</th>
        <th>Numero</th>
        <th>Operazioni</th>
      </tr>
      </thead>
      <tbody>${monthlyAppointments}</tbody>
      </table>`;
    }).join('');
  });
}

function main() {
  const token = localStorage.getItem(TOKEN_KEY);
  const username = localStorage.getItem(USERNAME_KEY);
  if (token != null && username != null) {
    displayAuthenticatedLayout(username);
    displayCalendar(token);
  } else {
    window.location.replace("/login/");
  }
}

document.addEventListener("DOMContentLoaded", main);
