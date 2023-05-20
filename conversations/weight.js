//@ts-check

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
      <tr>
        <td>
          <time datetime="${date.toISOString()}">${formatDate(date)}</time>
        </td>
        <td class="numeric_value">${weight.value.toFixed(1)}</td>
        <td class="numeric_value" style="${bmiStyle}">${bmiVal == null ? '-' : bmiVal.toFixed(2)}</td>
        <td class="operation">
          <button class="small delete_weight_item" data-date="${weight.date}">Elimina</button>
        </td>
      </tr>`;
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
 * See https://www.cdc.gov/obesity/basics/adult-defining.html
 *
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

/**
 * @enum {{label: string, bg: string, fg: string}}
 */
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

      const date = new Date(deleteDate + "T00:00:00");
      if (!confirm(`Vuoi cancellare la misura effettuata in data ${formatDate(date)}`)) {
        return;
      }

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