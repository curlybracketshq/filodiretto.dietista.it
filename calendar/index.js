//@ts-check

/**
 * @param {string} token
 * @param {string | null} yearMonth
 */
function displayCalendar(token, yearMonth) {
  const loading = requireElement("loading");
  loading.style.display = "block";
  const calendar = requireElement("calendar");
  calendar.style.display = "none";
  const content = requireElement("content");
  content.style.display = "none";

  let selectedYear, selectedMonth;
  if (yearMonth == null) {
    const now = new Date();
    selectedYear = now.getFullYear();
    selectedMonth = now.getMonth();
  } else {
    const [year, month] = yearMonth.split('-');
    selectedYear = parseInt(year, 10);
    selectedMonth = parseInt(month, 10) - 1;
  }

  const currMonthUTC = new Date(Date.UTC(selectedYear, selectedMonth));
  const isoCurrMonth = currMonthUTC.toISOString();
  const currYearMonth = isoCurrMonth.slice(0, 7);

  /** @type {Appointment[]} */
  let appointmentItems = [];
  // TODO: Load appointments for prev, current, and next month instead of all of
  // them
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

      const conversationByNumber = conversationItems.reduce(function (/** @type {Object.<string, Conversation>} */ acc, conversation) {
        acc[conversation.from.S] = conversation;
        return acc;
      }, {});

      const [appointmentsByDay, numApptsByMonth] = appointmentItems.reduce(function (/** @type {[Object.<string, Appointment[]>, Object.<string, Number>]} */[appointmentsByDay, numApptsByMonth], /** @type {Appointment} */ element) {
        /** @type {string[]} */
        let datetimeComponents;
        datetimeComponents = element.datetime.S.split('T');
        const [date, _time] = datetimeComponents;
        if (date in appointmentsByDay) {
          appointmentsByDay[date].push(element);
        } else {
          appointmentsByDay[date] = [element];
        }

        const [year, month, _day] = date.split('-');
        const yearMonth = `${year}-${month}`;
        if (yearMonth in numApptsByMonth) {
          numApptsByMonth[yearMonth] += 1;
        } else {
          numApptsByMonth[yearMonth] = 1;
        }

        return [appointmentsByDay, numApptsByMonth];
      }, [{}, {}]);
      calendar.innerHTML = appointmentsMonthHTML(
        appointmentsByDay,
        numApptsByMonth,
        conversationByNumber,
        currYearMonth
      );
    });
}

/**
 * @param {Object.<string, Appointment[]>} appointmentsByDay
 * @param {Object.<string, Number>} numApptsByMonth
 * @param {Object.<string, Conversation>} conversationByNumber
 * @param {string} yearMonth
 */
function appointmentsMonthHTML(appointmentsByDay, numApptsByMonth, conversationByNumber, yearMonth) {
  const [year, month] = yearMonth.split('-');
  const [yearNumber, monthNumber] = [parseInt(year, 10), parseInt(month, 10) - 1];
  const beginningOfMonth = new Date(Date.UTC(yearNumber, monthNumber, 1));
  const beginningOfMonthLocal = new Date(yearMonth + '-01T00:00');
  const beginningOfPrevMonth = new Date(Date.UTC(yearNumber, monthNumber - 1, 1));
  const prevYearMonth = beginningOfPrevMonth.toISOString().slice(0, 7);
  const beginningOfPrevMonthLocal = new Date(prevYearMonth + '-01T00:00');
  const beginningOfNextMonth = new Date(Date.UTC(yearNumber, monthNumber + 1, 1));
  const nextYearMonth = beginningOfNextMonth.toISOString().slice(0, 7);
  const beginningOfNextMonthLocal = new Date(nextYearMonth + '-01T00:00');
  const daysInMonth = Math.round((beginningOfNextMonth.getTime() - beginningOfMonth.getTime()) / 1000 / 60 / 60 / 24);
  const endOfMonth = new Date(Date.UTC(yearNumber, monthNumber, daysInMonth));
  const daysInPrevMonth = Math.round((beginningOfMonth.getTime() - beginningOfPrevMonth.getTime()) / 1000 / 60 / 60 / 24);
  /** @type string[][] */
  let calendarMonthWeeks = [[]];
  let week = 0;
  let dailyAppointmentsHTML;
  let prevMonthDay = daysInPrevMonth - beginningOfMonth.getUTCDay() + 1;
  for (let day = 0; day < beginningOfMonth.getUTCDay(); day++) {
    const date = new Date(Date.UTC(yearNumber, monthNumber - 1, prevMonthDay));
    dailyAppointmentsHTML = appointmentsDayHTML(appointmentsByDay, conversationByNumber, date);
    calendarMonthWeeks[week].push(`
    <td>
      <div class="day prev_month">
        <div class="number">${prevMonthDay}</div>
        <div class="appointments">
          ${dailyAppointmentsHTML}
        </div>
      </div>
    </td>`);
    prevMonthDay++;
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(Date.UTC(yearNumber, monthNumber, day));
    const dayOfWeek = date.getUTCDay();
    dailyAppointmentsHTML = appointmentsDayHTML(appointmentsByDay, conversationByNumber, date);
    calendarMonthWeeks[week].push(`
    <td>
      <div class="day ${dayOfWeek == 0 || dayOfWeek == 6 ? 'weekend' : ''}">
        <div class="number">${day}</div>
        <div class="appointments">
          ${dailyAppointmentsHTML}
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
    const date = new Date(Date.UTC(yearNumber, monthNumber + 1, nextMonthDay));
    dailyAppointmentsHTML = appointmentsDayHTML(appointmentsByDay, conversationByNumber, date);
    calendarMonthWeeks[week].push(`
    <td>
      <div class="day next_month">
        <div class="number">${nextMonthDay}</div>
        <div class="appointments">
          ${dailyAppointmentsHTML}
        </div>
      </div>
    </td>`);
    nextMonthDay++;
  }

  return `
  <div id="calendar_header">
    <h3><a href="/calendar/#${prevYearMonth}">${capitalizeFirstLetter(monthName(beginningOfPrevMonthLocal))} ${beginningOfPrevMonthLocal.getFullYear()} (${numApptsByMonth[prevYearMonth] == null ? 0 : numApptsByMonth[prevYearMonth]})</a></h3>
    <h2>${capitalizeFirstLetter(monthName(beginningOfMonthLocal))} ${year} (${numApptsByMonth[yearMonth] == null ? 0 : numApptsByMonth[yearMonth]})</h2>
    <h3><a href="/calendar/#${nextYearMonth}">${capitalizeFirstLetter(monthName(beginningOfNextMonthLocal))} ${beginningOfNextMonthLocal.getFullYear()} (${numApptsByMonth[nextYearMonth] == null ? 0 : numApptsByMonth[nextYearMonth]})</a></h3>
  </div>
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
}

/**
 * @param {Object.<string, Appointment[]>} appointmentsByDay
 * @param {Object.<string, Conversation>} conversationByNumber
 * @param {Date} date
 */
function appointmentsDayHTML(appointmentsByDay, conversationByNumber, date) {
  const [isoDate, _time] = date.toISOString().split('T');
  const dailyAppointments = appointmentsByDay[isoDate] == null ? [] : appointmentsByDay[isoDate];
  return dailyAppointments.sort(function (/** @type {Appointment} */ a, /** @type {Appointment} */ b) {
    if (a.datetime.S < b.datetime.S) {
      return -1;
    }
    if (a.datetime.S > b.datetime.S) {
      return 1;
    }
    return 0;
  }).map(function (/** @type {Appointment} */ element) {
    const date = new Date(element.datetime.S);
    const conversation = conversationByNumber[element.from.S];
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
}

function main() {
  const auth = requireAuth();
  if (auth == null) {
    return;
  }
  const {token, username} = auth;
  displayAuthenticatedLayout(username);
  if (location.hash == "") {
    displayCalendar(token, null);
  } else {
    const [_, yearMonth] = location.hash.split('#');
    displayCalendar(token, yearMonth);
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
    displayCalendar(token, null);
  } else {
    const [_, yearMonth] = location.hash.split('#');
    displayCalendar(token, yearMonth);
  }
}

window.addEventListener("hashchange", hashChange);