//@ts-check

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
