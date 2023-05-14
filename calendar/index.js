//@ts-check

/**
 * @param {string} token
 */
function displayCalendar(token) {
  const loading = requireElement("loading");
  loading.style.display = "block";

  /** @type {Appointment[]} */
  let appointmentItems = [];
  fetchAppointments(token, null, null, null, [])
    .then(items => {
      appointmentItems = items;

      if (items.length == 0) {
        return [];
      }

      return fetchConversations(token, ['firstName', 'lastName'], null, []);
    })
    .then(conversationItems => {
      const loading = requireElement("loading");
      loading.style.display = "none";
      const calendar = requireElement("calendar");
      calendar.style.display = "block";
      const content = requireElement("content");
      content.style.display = "block";

      const conversationItemsByNumber = conversationItems.reduce(function (/** @type {Object.<string, Conversation>} */ acc, conversation) {
        acc[conversation.from.S] = conversation;
        return acc;
      }, {});

      const [appointmentsByDay, months] = appointmentItems.reduce(function (/** @type {[Object.<string, Appointment[]>, Object.<string, Boolean>]} */[appointmentsByDay, months], /** @type {Appointment} */ element) {
        /** @type {string[]} */
        let datetimeComponents;
        datetimeComponents = element.datetime.S.split('T');
        const [date, _time] = datetimeComponents;
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
        const beginningOfMonth = new Date(Date.UTC(yearNumber, monthNumber, 1));
        const beginningOfMonthLocal = new Date(yearMonth + '-01T00:00');
        const beginningOfPrevMonth = new Date(Date.UTC(yearNumber, monthNumber - 1, 1));
        const beginningOfNextMonth = new Date(Date.UTC(yearNumber, monthNumber + 1, 1));
        const daysInMonth = Math.round((beginningOfNextMonth.getTime() - beginningOfMonth.getTime()) / 1000 / 60 / 60 / 24);
        const endOfMonth = new Date(Date.UTC(yearNumber, monthNumber, daysInMonth));
        const daysInPrevMonth = Math.round((beginningOfMonth.getTime() - beginningOfPrevMonth.getTime()) / 1000 / 60 / 60 / 24);
        /** @type string[][] */
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
          const date = new Date(Date.UTC(yearNumber, monthNumber, day));
          const dayOfWeek = date.getUTCDay();
          const [isoDate, _time] = date.toISOString().split('T');
          const dailyAppointments = appointmentsByDay[isoDate] == null ? [] : appointmentsByDay[isoDate];
          const dailyAppointmentsItems = dailyAppointments.sort(function (/** @type {Appointment} */ a, /** @type {Appointment} */ b) {
            if (a.datetime.S < b.datetime.S) {
              return -1;
            }
            if (a.datetime.S > b.datetime.S) {
              return 1;
            }
            return 0;
          }).map(function (/** @type {Appointment} */ element) {
            const date = new Date(element.datetime.S);
            const conversation = conversationItemsByNumber[element.from.S];
            if (conversation == null) {
              return '';
            }
            return `
            <div class="appointment ${element.type?.S != null ? element.type.S : ""}">
              <div class="first_line">
                <div class="time"><a href="${appointmentURL(element)}">${formatTime(date)}</a></div>
                <div class="reminder_sent">${element.reminderSentAt?.S != null ? "✅" : ""}</div>
              </div>
              <div class="appointment_type">${displayAppointmentType(element.type?.S) ?? ''}</div>
              <div class="full_name"><a href="${conversationURL(conversation)}">${fullName(conversation)}</a></div>
            </div>`;
          }).join('');
          calendarMonthWeeks[week].push(`
          <td>
            <div class="day ${dayOfWeek == 0 || dayOfWeek == 6 ? 'weekend' : ''}">
              <div class="number">${day}</div>
              <div class="appointments">
                ${dailyAppointmentsItems}
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
        <h2>${capitalizeFirstLetter(monthName(beginningOfMonthLocal))} ${year}</h2>
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
