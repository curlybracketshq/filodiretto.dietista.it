//@ts-check

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
  handleFetchGenericError(request)
    .then(handleFetchAuthError)
    .then(([_error, success]) => {
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
            <td><a href="/appointments/#${element.from.S}|${element.datetime.S}">Dettagli</a></td>
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
