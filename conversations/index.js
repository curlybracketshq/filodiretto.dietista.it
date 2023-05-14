//@ts-check

/**
 * @param {string} token
 */
function displayConversations(token) {
  const loading = requireElement("loading");
  loading.style.display = "block";
  const conversationDetails = requireElement("conversation_details");
  conversationDetails.style.display = "none";

  fetchConversations(token, ['firstName', 'lastName'], null, [])
    .then(items => {
      const loading = requireElement("loading");
      loading.style.display = "none";
      const conversations = requireElement("conversations");
      conversations.style.display = "block";
      const content = requireElement("content");
      content.style.display = "block";

      const tableContent = items
        .sort((a, b) => {
          const aLastName = a.lastName?.S ?? '';
          const bLastName = b.lastName?.S ?? '';
          if (aLastName < bLastName) {
            return -1;
          } else if (aLastName > bLastName) {
            return 1;
          } else {
            const aFirstName = a.firstName?.S ?? '';
            const bFirstName = b.firstName?.S ?? '';
            if (aFirstName < bFirstName) {
              return -1;
            } else if (aFirstName > bFirstName) {
              return 1;
            } else {
              return 0;
            }
          }
        })
        .map(element => {
          return `
          <tr>
            <td>${formatPhoneNumber(element.from.S)}</td>
            <td>${element.firstName?.S ?? ''}</td>
            <td>${element.lastName?.S ?? ''}</td>
            <td class="operation"><a href="${conversationURL(element)}">Dettagli</a></td>
            <td class="operation"><a class="delete_conversation" href="#" data-from="${element.from.S}">Elimina</a></td>
          </tr>`;
        }).join('');
      const conversationsTableContent = requireElement("conversations_table_content");
      conversationsTableContent.innerHTML = tableContent;

      attachDeleteConversationListeners(token);
    });
}

/**
 * @param {string} token
 */
function attachDeleteConversationListeners(token) {
  const elements = document.getElementsByClassName("delete_conversation");
  let element;
  for (let i = 0; i < elements.length; i++) {
    element = elements[i];
    if (!(element instanceof HTMLElement)) {
      throw new Error("Missing element");
    }
    const from = element.dataset.from;
    element.addEventListener("click", function (event) {
      event.preventDefault();

      if (from == null) {
        return;
      }

      if (!confirm(`Vuoi eliminare ${formatPhoneNumber(from)}?`)) {
        return;
      }

      const params = new URLSearchParams('token=' + token + '&from=' + from);
      const request = fetch(CONVERSATION_URL + '?' + params, {
        method: "DELETE",
      });
      handleFetchGenericError(request)
        .then(handleFetchAuthError)
        .then(([_error, success]) => {
          if (success == null) {
            return;
          }

          window.location.replace("/conversations/");
        });
    });
  }
}

/**
 * @param {string} token
 * @param {string} from
 */
function displayConversationDetails(token, from) {
  const title = requireElement("title");
  title.innerHTML = `📇 Numero: ${formatPhoneNumber(from)}`;

  const loading = requireElement("loading");
  loading.style.display = "block";
  const conversations = requireElement("conversations");
  conversations.style.display = "none";

  const params = new URLSearchParams('token=' + token + '&from=' + from);
  const request = fetch(CONVERSATION_URL + '?' + params, {
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
      const conversationDetails = requireElement("conversation_details");
      conversationDetails.style.display = "block";
      const content = requireElement("content");
      content.style.display = "block";

      const conversationDetailsResponse = JSON.parse(success.content);
      /** @type {Conversation} */
      const conversation = conversationDetailsResponse.Item;
      const firstNameInput = requireInputElement("first_name_input");
      firstNameInput.value = conversation.firstName?.S ?? '';
      const lastNameInput = requireInputElement("last_name_input");
      lastNameInput.value = conversation.lastName?.S ?? '';
      const heightInput = requireInputElement("height_input");
      heightInput.value = conversation.height?.N ?? '';
      const birthDateInput = requireInputElement("birth_date_input");
      birthDateInput.value = conversation.birthDate?.S ?? '';
      const genderSelect = requireSelectElement("gender_select");
      genderSelect.value = conversation.gender?.S ?? '';
      const notesTextarea = requireTextAreaElement("notes_textarea");
      notesTextarea.value = conversation.notes?.S ?? '';
      const newAppointmentLink = requireAnchorElement("new_appointment_link");
      newAppointmentLink.href += `#${conversation.from.S}`;

      attachUpdateConversationDetailsListener(token, conversation);

      // Weights list
      let weightsList;
      if (conversation.weights?.S == null) {
        weightsList = [];
      } else {
        weightsList = JSON.parse(conversation.weights?.S);
      }
      displayWeights(token, conversation, weightsList);

      // Initialize new weight date input with today's date
      const weightDateInput = requireInputElement("weight_date_input");
      weightDateInput.value = new Date().toISOString().slice(0, 10);

      attachAddWeightListener(token, conversation);

      // Waist/hips list
      let waistHipsList;
      if (conversation.waistHips?.S == null) {
        waistHipsList = [];
      } else {
        waistHipsList = JSON.parse(conversation.waistHips?.S);
      }
      displayWaistHips(token, conversation, waistHipsList);

      // Initialize new waist/hip date input with today's date
      const waistHipDateInput = requireInputElement("waist_hip_date_input");
      waistHipDateInput.value = new Date().toISOString().slice(0, 10);

      attachAddWaistHipListener(token, conversation);

      // Load next appointment
      const nextAppointment = requireElement("next_appointment");
      nextAppointment.innerHTML = "Caricamento...";

      const nextAppointmentParams = new URLSearchParams('token=' + token + '&from=' + from);
      const nextAppointmentRequest = fetch(NEXT_APPOINTMENT_URL + '?' + nextAppointmentParams, {
        method: "GET",
      });
      handleFetchGenericError(nextAppointmentRequest)
        .then(handleFetchAuthError)
        .then(([_error, success]) => {
          if (success == null) {
            return;
          }

          const appointmentDetailsResponse = JSON.parse(success.content);
          if (appointmentDetailsResponse.Items.length == 0) {
            nextAppointment.innerHTML = 'Nessun appuntamento';
          } else {
            const nextAppointmentDetails = appointmentDetailsResponse.Items[0];
            const date = new Date(nextAppointmentDetails.datetime.S);
            nextAppointment.innerHTML = `
            <a href="${appointmentURL(nextAppointmentDetails)}">${formatDateTime(date)}</a>
            ${nextAppointmentDetails.type?.S != null ? '(' + displayAppointmentType(nextAppointmentDetails.type.S) + ')' : ''}
            `;
          }
        });

      // Load contact appointments
      const appointments = requireElement("appointments");
      appointments.innerHTML = "<p>Caricamento...</p>";

      fetchAppointments(token, from, null, null, [])
        .then(items => {
          if (items.length == 0) {
            appointments.innerHTML = '<p>Nessun appuntamento</p>';
          } else {
            const appointmentsItems = items.map((/** @type {Appointment} */ appointment) => {
              const date = new Date(appointment.datetime.S);
              return `
              <li>
                <a href="${appointmentURL(appointment)}">${formatDateTime(date)}</a>
                ${appointment.type?.S != null ? '(' + displayAppointmentType(appointment.type.S) + ')' : ''}
              </li>`;
            }).join('');
            appointments.innerHTML = `<ul>${appointmentsItems}</ul>`;
          }
        });

      // Load contact messages
      const messages = requireElement("messages");
      messages.innerHTML = "<p>Caricamento...</p>";

      fetchMessages(token, from, null, [])
        .then(items => {
          let canReply = false;
          if (items.length == 0) {
            messages.innerHTML = '<p>Nessun messaggio</p>';
          } else {
            const userMessages = items.filter(message => message.source == null);
            const lastMessage = userMessages.length > 0 ? userMessages[0] : { timestamp: { S: '0' } };
            const date = new Date(parseInt(lastMessage.timestamp.S, 10) * 1000);
            const now = new Date();
            const delta = now.getTime() - date.getTime();
            let replyBox;
            if (delta < 60 * 60 * 24 * 1000) {
              canReply = true;
              replyBox = `
              <form id="reply_form">
                <div>
                  <label>Risposta</label>
                  <textarea id="reply_textarea" name="reply" rows="5" cols="60"></textarea>
                </div>
                <div><input type="submit" id="send_reply" value="Invia" /></div>
              </form>
              <button class="primary" id="autocomplete_reply">Autocompleta</button>`;
            } else {
              replyBox = `
              <p>
                <strong>Nota:</strong> non puoi rispondere perché l'ultimo messaggio è stato inviato più di 24 ore fa.
              </p>`;
            }
            const messagesItems = items.map((/** @type {Message} */ message) => {
              const date = new Date(parseInt(message.timestamp.S, 10) * 1000);
              const text = message.text?.S;
              if (text == null) {
                throw new Error("Message text not present");
              }
              const { body } = JSON.parse(text);
              const source = message.source?.S ?? "";
              return `
              <div class="message ${source}">
                <time datetime="${date.toISOString()}">${date.toLocaleString()}</time>
                <div class="message_body">${sanitizeHTML(body)}</div>
              </div>`;
            }).join('');
            messages.innerHTML = `
            ${replyBox}
            <div id="messages_list">${messagesItems}</div>`;
          }

          if (canReply) {
            attachSendReplyListener(token, conversation);
            attachAutocompleteReplyListener(token);
          }
        });
    });
}

/**
 * Weights
 */

/**
 * @param {string} token
 * @param {Conversation} conversation
 * @param {Array<WeightItem>} weightsList
 */
function displayWeights(token, conversation, weightsList) {
  const weights = requireElement("weights");
  const weightItems = weightsList
    .sort((a, b) => {
      if (a.date < b.date) {
        return -1;
      } else if (a.date > b.date) {
        return 1;
      } else {
        return 1;
      }
    })
    .map(weight => {
      const date = new Date(weight.date + "T00:00:00");
      const bmiVal = conversation.height?.N == null ? null : bmi({ weightKg: weight.value, heightCm: parseFloat(conversation.height.N) });
      let bmiStyle = '';
      if (bmiVal != null) {
        const bmiRangeVal = bmiRange(bmiVal);
        bmiStyle = `background-color: ${bmiRangeVal.bg}; color: ${bmiRangeVal.fg}`;
      }

      return `
      <input type="hidden" class="weight_item_data" value="${encodeURIComponent(JSON.stringify(weight))}" />
      <div class="weight_item">
        <time datetime="${date.toISOString()}">${formatDate(date)}</time>
        <div class="value">${weight.value.toFixed(1)} kg</div>
        <div class="value" style="${bmiStyle}">${bmiVal == null ? '-' : bmiVal.toFixed(2)} kg/m<sup>2</sup></div>
        <div>
          <button class="small delete_weight_item" data-date="${weight.date}">Elimina</button>
        </div>
      </div>`;
    }).join('');
  weights.innerHTML = weightItems;

  attachDeleteWeightListeners(token, conversation);
}

/**
 * @param {{weightKg: number, heightCm: number}} input
 * @returns {number}
 */
function bmi({ weightKg, heightCm }) {
  return weightKg / Math.pow(heightCm / 100, 2);
}

/**
 * @param {number} bmi
 * @returns {BMIRange}
 */
function bmiRange(bmi) {
  if (bmi < 18.5) {
    return BMIRange.underweight;
  } else if (bmi < 25) {
    return BMIRange.healtyweight;
  } else if (bmi < 30) {
    return BMIRange.overweight;
  } else if (bmi < 35) {
    return BMIRange.obesityClass1;
  } else if (bmi < 40) {
    return BMIRange.obesityClass2;
  } else {
    return BMIRange.obesityClass3;
  }
}

/** @enum {{label: string, bg: string, fg: string}} */
const BMIRange = {
  underweight: { label: 'Sottopeso', bg: '#01B0F2', fg: '#222' },
  healtyweight: { label: 'Normopeso', bg: '#8FD44B', fg: '#222' },
  overweight: { label: 'Sovrappeso', bg: '#FEFE03', fg: '#222' },
  obesityClass1: { label: 'Obesità di I grado', bg: '#FDC101', fg: '#222' },
  obesityClass2: { label: 'Obesità di II grado', bg: '#FDC101', fg: '#222' },
  obesityClass3: { label: 'Obesità di III grado', bg: '#FE0000', fg: '#eee' },
};

/**
 * @param {string} token
 * @param {Conversation} conversation
 */
function attachDeleteWeightListeners(token, conversation) {
  const elements = document.getElementsByClassName("delete_weight_item");
  let element;
  for (let i = 0; i < elements.length; i++) {
    element = elements[i];
    if (!(element instanceof HTMLElement)) {
      throw new Error("Missing element");
    }
    const deleteDate = element.dataset.date;
    element.addEventListener("click", function (event) {
      event.preventDefault();

      const weightItems = document.getElementsByClassName("weight_item_data");
      let weightItem;
      /** @type {Array<WeightItem>} */
      let weights = [];
      for (let i = 0; i < weightItems.length; i++) {
        weightItem = weightItems[i];
        if (!(weightItem instanceof HTMLInputElement)) {
          throw new Error("Missing element");
        }
        weights.push(JSON.parse(decodeURIComponent(weightItem.value)));
      }

      const newWeights = weights.filter(({ date }) => deleteDate != date);

      // Disable all delete weight buttons
      for (let i = 0; i < elements.length; i++) {
        element = elements[i];
        if (!(element instanceof HTMLButtonElement)) {
          throw new Error("Missing element");
        }
        element.disabled = true;
      }

      // Disable add weight button
      const addWeightButton = requireInputElement("add_weight");
      addWeightButton.disabled = true;

      const request = fetch(CONVERSATION_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          conversation: {
            from: conversation.from.S,
            weights: JSON.stringify(newWeights),
          }
        })
      });
      handleFetchGenericError(request)
        .then(handleFetchAuthError)
        .then(([error, success]) => {
          addWeightButton.disabled = false;

          if (error != null) {
            return;
          }

          if (success == null) {
            throw new Error("Success can't be null");
          }

          const result = JSON.parse(success.content);
          const weightsList = JSON.parse(result.Attributes.weights.S);
          displayWeights(token, conversation, weightsList);

          const infoMessage = requireElement("info_message");
          infoMessage.innerHTML = "Pesi aggiornati correttamente";
          infoMessage.style.display = "block";
        });
    });
  }
}

/**
 * @param {string} token
 * @param {Conversation} conversation
 */
function attachAddWeightListener(token, conversation) {
  const form = requireElement("add_weight_form");

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    const weightItems = document.getElementsByClassName("weight_item_data");
    let weightItem;
    /** @type {Array<WeightItem>} */
    let weights = [];
    for (let i = 0; i < weightItems.length; i++) {
      weightItem = weightItems[i];
      if (!(weightItem instanceof HTMLInputElement)) {
        throw new Error("Missing element");
      }
      weights.push(JSON.parse(decodeURIComponent(weightItem.value)));
    }

    const weightDateInput = requireInputElement("weight_date_input");
    const weightValueInput = requireInputElement("weight_value_input");

    weights.push({
      date: weightDateInput.value,
      value: parseFloat(weightValueInput.value.replace(",", "."))
    });

    const elements = document.getElementsByClassName("delete_weight_item");
    let element;
    // Disable all delete weight buttons
    for (let i = 0; i < elements.length; i++) {
      element = elements[i];
      if (!(element instanceof HTMLButtonElement)) {
        throw new Error("Missing element");
      }
      element.disabled = true;
    }

    // Disable add weight button
    const addWeightButton = requireInputElement("add_weight");
    addWeightButton.disabled = true;
    addWeightButton.value = "Caricamento...";

    const request = fetch(CONVERSATION_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        conversation: {
          from: conversation.from.S,
          weights: JSON.stringify(weights),
        }
      })
    });
    handleFetchGenericError(request)
      .then(handleFetchAuthError)
      .then(([error, success]) => {
        addWeightButton.disabled = false;
        addWeightButton.value = "Aggiungi";

        // Re-initialize new weight date input with today's date
        const weightDateInput = requireInputElement("weight_date_input");
        weightDateInput.value = new Date().toISOString().slice(0, 10);

        // Reset new weight value inputs
        const weightValueInput = requireInputElement("weight_value_input");
        weightValueInput.value = "";

        if (error != null) {
          return;
        }

        if (success == null) {
          throw new Error("Success can't be null");
        }

        const result = JSON.parse(success.content);
        const weightsList = JSON.parse(result.Attributes.weights.S);
        displayWeights(token, conversation, weightsList);

        const infoMessage = requireElement("info_message");
        infoMessage.innerHTML = "Pesi aggiornati correttamente";
        infoMessage.style.display = "block";
      });
  });
}

/**
 * Waist/hip measurements
 */

/**
 * @param {string} token
 * @param {Conversation} conversation
 * @param {Array<WaistHipItem>} waistHipsList
 */
function displayWaistHips(token, conversation, waistHipsList) {
  const waistHips = requireElement("waist_hips");
  const waistHipItems = waistHipsList
    .sort((a, b) => {
      if (a.date < b.date) {
        return -1;
      } else if (a.date > b.date) {
        return 1;
      } else {
        return 1;
      }
    })
    .map(waistHip => {
      const date = new Date(waistHip.date + "T00:00:00");
      return `
      <input type="hidden" class="waist_hip_item_data" value="${encodeURIComponent(JSON.stringify(waistHip))}" />
      <div class="waist_hip_item">
        <time datetime="${date.toISOString()}">${formatDate(date)}</time>
        <div class="value">${waistHip.waist} cm</div>
        <div class="value">${waistHip.hip} cm</div>
        <div class="value">${(waistHip.waist / waistHip.hip).toFixed(2)} WHR</div>
        <div>
          <button class="small delete_waist_hip_item" data-date="${waistHip.date}">Elimina</button>
        </div>
      </div>`;
    }).join('');
  waistHips.innerHTML = waistHipItems;

  attachDeleteWaistHipListeners(token, conversation);
}

/**
 * @param {string} token
 * @param {Conversation} conversation
 */
function attachDeleteWaistHipListeners(token, conversation) {
  const elements = document.getElementsByClassName("delete_waist_hip_item");
  let element;
  for (let i = 0; i < elements.length; i++) {
    element = elements[i];
    if (!(element instanceof HTMLElement)) {
      throw new Error("Missing element");
    }
    const deleteDate = element.dataset.date;
    element.addEventListener("click", function (event) {
      event.preventDefault();

      const waistHipItems = document.getElementsByClassName("waist_hip_item_data");
      let waistHipItem;
      /** @type {Array<WaistHipItem>} */
      let waistHips = [];
      for (let i = 0; i < waistHipItems.length; i++) {
        waistHipItem = waistHipItems[i];
        if (!(waistHipItem instanceof HTMLInputElement)) {
          throw new Error("Missing element");
        }
        waistHips.push(JSON.parse(decodeURIComponent(waistHipItem.value)));
      }

      const newWaistHips = waistHips.filter(({ date }) => deleteDate != date);

      // Disable all delete waist/hip measurement buttons
      for (let i = 0; i < elements.length; i++) {
        element = elements[i];
        if (!(element instanceof HTMLButtonElement)) {
          throw new Error("Missing element");
        }
        element.disabled = true;
      }

      // Disable add waist/hip measurement button
      const addWaistHipButton = requireInputElement("add_waist_hip");
      addWaistHipButton.disabled = true;

      const request = fetch(CONVERSATION_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          conversation: {
            from: conversation.from.S,
            waist_hips: JSON.stringify(newWaistHips),
          }
        })
      });
      handleFetchGenericError(request)
        .then(handleFetchAuthError)
        .then(([error, success]) => {
          addWaistHipButton.disabled = false;

          if (error != null) {
            return;
          }

          if (success == null) {
            throw new Error("Success can't be null");
          }

          const result = JSON.parse(success.content);
          const waistHipsList = JSON.parse(result.Attributes.waistHips.S);
          displayWaistHips(token, conversation, waistHipsList);

          const infoMessage = requireElement("info_message");
          infoMessage.innerHTML = "Misure aggiornate correttamente";
          infoMessage.style.display = "block";
        });
    });
  }
}

/**
 * @param {string} token
 * @param {Conversation} conversation
 */
function attachAddWaistHipListener(token, conversation) {
  const form = requireElement("add_waist_hip_form");

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    const waistHipItems = document.getElementsByClassName("waist_hip_item_data");
    let waistHipItem;
    /** @type {Array<WaistHipItem>} */
    let waistHips = [];
    for (let i = 0; i < waistHipItems.length; i++) {
      waistHipItem = waistHipItems[i];
      if (!(waistHipItem instanceof HTMLInputElement)) {
        throw new Error("Missing element");
      }
      waistHips.push(JSON.parse(decodeURIComponent(waistHipItem.value)));
    }

    const waistHipDateInput = requireInputElement("waist_hip_date_input");
    const waistHipWaistValueInput = requireInputElement("waist_hip_waist_value_input");
    const waistHipHipValueInput = requireInputElement("waist_hip_hip_value_input");

    waistHips.push({
      date: waistHipDateInput.value,
      waist: parseFloat(waistHipWaistValueInput.value.replace(",", ".")),
      hip: parseFloat(waistHipHipValueInput.value.replace(",", "."))
    });

    const elements = document.getElementsByClassName("delete_waist_hip_item");
    let element;
    // Disable all delete waist/hip measurement buttons
    for (let i = 0; i < elements.length; i++) {
      element = elements[i];
      if (!(element instanceof HTMLButtonElement)) {
        throw new Error("Missing element");
      }
      element.disabled = true;
    }

    // Disable add waist/hip measurement button
    const addWaistHipButton = requireInputElement("add_waist_hip");
    addWaistHipButton.disabled = true;
    addWaistHipButton.value = "Caricamento...";

    const request = fetch(CONVERSATION_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        conversation: {
          from: conversation.from.S,
          waist_hips: JSON.stringify(waistHips),
        }
      })
    });
    handleFetchGenericError(request)
      .then(handleFetchAuthError)
      .then(([error, success]) => {
        addWaistHipButton.disabled = false;
        addWaistHipButton.value = "Aggiungi";

        // Re-initialize new waist/hip measurement date input with today's date
        const waistHipDateInput = requireInputElement("waist_hip_date_input");
        waistHipDateInput.value = new Date().toISOString().slice(0, 10);

        // Reset new waist/hip measurement value inputs
        const waistHipWaistValueInput = requireInputElement("waist_hip_waist_value_input");
        waistHipWaistValueInput.value = "";
        const waistHipHipValueInput = requireInputElement("waist_hip_hip_value_input");
        waistHipHipValueInput.value = "";

        if (error != null) {
          return;
        }

        if (success == null) {
          throw new Error("Success can't be null");
        }

        const result = JSON.parse(success.content);
        const waistHipsList = JSON.parse(result.Attributes.waistHips.S);
        displayWaistHips(token, conversation, waistHipsList);

        const infoMessage = requireElement("info_message");
        infoMessage.innerHTML = "Misure aggiornate correttamente";
        infoMessage.style.display = "block";
      });
  });
}

/**
 * @param {string} token
 * @param {Conversation} conversation
 */
function attachUpdateConversationDetailsListener(token, conversation) {
  const submitButton = requireInputElement("update_conversation_details");
  const form = requireElement("conversation_details_form");

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    const firstNameInput = requireInputElement("first_name_input");
    const lastNameInput = requireInputElement("last_name_input");
    const heightInput = requireInputElement("height_input");
    const birthDateInput = requireInputElement("birth_date_input");
    const genderSelect = requireSelectElement("gender_select");
    const notesTextarea = requireTextAreaElement("notes_textarea");

    submitButton.disabled = true;
    submitButton.value = "Caricamento...";

    const request = fetch(CONVERSATION_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        conversation: {
          from: conversation.from.S,
          first_name: firstNameInput.value,
          last_name: lastNameInput.value,
          height: heightInput.value,
          birth_date: birthDateInput.value,
          gender: genderSelect.value,
          notes: notesTextarea.value
        }
      })
    });
    handleFetchGenericError(request)
      .then(handleFetchAuthError)
      .then(([error, success]) => {
        submitButton.disabled = false;
        submitButton.value = "Aggiorna";

        if (error != null) {
          return;
        }

        if (success == null) {
          throw new Error("Success can't be null");
        }

        const result = JSON.parse(success.content);

        const infoMessage = requireElement("info_message");
        infoMessage.innerHTML = "Conversazione aggiornata correttamente";
        infoMessage.style.display = "block";
      });
  });
}

/**
 * @param {string} token
 */
function attachAutocompleteReplyListener(token) {
  // Where source is not 'filodiretto'
  const userMessages = document.querySelectorAll('.message:not(.filodiretto) .message_body');
  if (userMessages.length == 0 || !(userMessages[0] instanceof HTMLElement)) {
    return;
  }
  const lastMessageElement = userMessages[0];
  const message = lastMessageElement.innerText;
  const submitButton = requireInputElement("send_reply");
  const autocompleteButton = requireButtonElement("autocomplete_reply");

  autocompleteButton.addEventListener("click", function (event) {
    const replyTextarea = requireTextAreaElement("reply_textarea");

    submitButton.disabled = true;
    autocompleteButton.disabled = true;
    autocompleteButton.innerHTML = "Caricamento...";

    const request = fetch(AUTOCOMPLETE_MESSAGE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        message
      })
    });
    handleFetchGenericError(request)
      .then(handleFetchAuthError)
      .then(([error, success]) => {
        submitButton.disabled = false;
        autocompleteButton.disabled = false;
        autocompleteButton.innerHTML = "Autocompleta";

        if (error != null) {
          return;
        }

        if (success == null) {
          throw new Error("Success can't be null");
        }

        const result = JSON.parse(success.content);

        replyTextarea.value = result.content;
      });
  });
}

/**
 * @param {string} token
 * @param {Conversation} conversation
 */
function attachSendReplyListener(token, conversation) {
  const submitButton = requireInputElement("send_reply");
  const autocompleteButton = requireButtonElement("autocomplete_reply");
  const form = requireElement("reply_form");

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    const replyTextarea = requireTextAreaElement("reply_textarea");

    autocompleteButton.disabled = true;
    submitButton.disabled = true;
    submitButton.value = "Caricamento...";

    const request = fetch(SEND_MESSAGE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        to: conversation.from.S,
        content: replyTextarea.value
      })
    });
    handleFetchGenericError(request)
      .then(handleFetchAuthError)
      .then(([error, success]) => {
        autocompleteButton.disabled = false;
        submitButton.disabled = false;
        submitButton.value = "Invia";

        if (error != null) {
          return;
        }

        if (success == null) {
          throw new Error("Success can't be null");
        }

        console.log(success.content);

        const infoMessage = requireElement("info_message");
        infoMessage.innerHTML = "Risposta inviata correttamente";
        infoMessage.style.display = "block";
      });
  });
}

function main() {
  const token = localStorage.getItem(TOKEN_KEY);
  const username = localStorage.getItem(USERNAME_KEY);
  if (token != null && username != null) {
    displayAuthenticatedLayout(username);
    if (location.hash == "") {
      displayConversations(token);
    } else {
      const [_, from] = location.hash.split('#');
      displayConversationDetails(token, from);
    }
  } else {
    window.location.replace("/login/");
  }
}

document.addEventListener("DOMContentLoaded", main);

function hashChange() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token != null) {
    if (location.hash == "") {
      displayConversations(token);
    } else {
      const [_, from] = location.hash.split('#');
      displayConversationDetails(token, from);
    }
  } else {
    window.location.replace("/login/");
  }
}

window.addEventListener("hashchange", hashChange);
