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
      const [appointmentsByDay, months] = appointmentsResponse.Items.reduce(function (/** @type {[Object.<string, Appointment[]>, Object.<string, Boolean>]} */[appointmentsByDay, months], /** @type {Appointment} */ element) {
        const [date, _time] = element.datetime.S.split('T');
        const [year, month, _day] = date.split('-');
        const yearMonth = `${year}-${month}`;
        months[yearMonth] = true;
        if (date in appointmentsByDay) {
          appointmentsByDay[date].push(element);
        } else {
          appointmentsByDay[date] = [element];
        }
        return [appointmentsByDay, months];
      }, [{}, {}]);
      const sortedMonths = Object.keys(months).sort();
      calendar.innerHTML = sortedMonths.map((/** @type {string} */ yearMonth) => {
        const [year, month] = yearMonth.split('-');
        const [yearNumber, monthNumber] = [parseInt(year, 10), parseInt(month, 10) - 1];
        const beginningOfMonth = new Date(yearNumber, monthNumber, 1);
        const beginningOfPrevMonth = new Date(yearNumber, monthNumber - 1, 1);
        const beginningOfNextMonth = new Date(yearNumber, monthNumber + 1, 1);
        const daysInMonth = Math.round((beginningOfNextMonth.getTime() - beginningOfMonth.getTime()) / 1000 / 60 / 60 / 24);
        const endOfMonth = new Date(yearNumber, monthNumber, daysInMonth);
        const daysInPrevMonth = Math.round((beginningOfMonth.getTime() - beginningOfPrevMonth.getTime()) / 1000 / 60 / 60 / 24);
        let calendarMonthWeeks = [[]];
        let week = 0;
        let prevMonthDay = daysInPrevMonth - beginningOfMonth.getUTCDay() + 1;
        for (let day = 0; day < beginningOfMonth.getUTCDay(); day++) {
          calendarMonthWeeks[week].push(`
          <td>
            <div class="day prev_month">
              <div class="number">${prevMonthDay}</div>
              <div class="appointments"></div>
            </div>
          </td>`);
          prevMonthDay++;
        }
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(yearNumber, monthNumber, day);
          const dayOfWeek = date.getUTCDay();
          const [isoDate, _time] = date.toISOString().split('T');
          const dailyAppointments = appointmentsByDay[isoDate] == null ? [] : appointmentsByDay[isoDate];
          const dailyAppointmentsItems = dailyAppointments.sort(function (/** @type {{ datetime: { S: number; }; }} */ a, /** @type {{ datetime: { S: number; }; }} */ b) {
            if (a.datetime.S < b.datetime.S) {
              return -1;
            }
            if (a.datetime.S > b.datetime.S) {
              return 1;
            }
            return 0;
          }).map(function (/** @type {Appointment} */ element) {
            const [_date, time] = element.datetime.S.split('T');
            return `<li><a href="/appointments/#${element.from.S}|${element.datetime.S}">${time} (${element.from.S})</a></li>`;
          }).join('');
          calendarMonthWeeks[week].push(`
          <td>
            <div class="day ${dayOfWeek == 0 || dayOfWeek == 6 ? 'weekend' : ''}">
              <div class="number">${day}</div>
              <div class="appointments">
                <ul>${dailyAppointmentsItems}</ul>
              </div>
            </div>
          </td>`);
          if (dayOfWeek == 6) {
            calendarMonthWeeks.push([]);
            week++;
          }
        }
        let nextMonthDay = 1;
        for (let day = endOfMonth.getUTCDay(); day < 6; day++) {
          calendarMonthWeeks[week].push(`
          <td>
            <div class="day next_month">
              <div class="number">${nextMonthDay}</div>
              <div class="appointments"></div>
            </div>
          </td>`);
          nextMonthDay++;
        }

        return `
        <h2>${monthName(parseInt(month, 10))} ${year}</h2>
        <table>
        <thead>
        <tr>
          <th class="weekend">D</th>
          <th>L</th>
          <th>M</th>
          <th>M</th>
          <th>G</th>
          <th>V</th>
          <th class="weekend">S</th>
        </tr>
        </thead>
        <tbody>${calendarMonthWeeks.map(week => `<tr>${week.join('')}</tr>`).join('')}</tbody>
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
