//@ts-check

const TOKEN_KEY = 'TOKEN';
const USERNAME_KEY = 'USERNAME';

const LOGIN_URL = "https://08b499nwhf.execute-api.us-east-1.amazonaws.com/default/filoDirettoAuth";
const CONVERSATIONS_URL = "https://08b499nwhf.execute-api.us-east-1.amazonaws.com/default/filoDirettoConversations";
const CONVERSATION_URL = "https://08b499nwhf.execute-api.us-east-1.amazonaws.com/default/filoDirettoConversation";

/**
 * @param {string} token
 */
function displayConversations(token) {
  const title = document.getElementById("title");
  if (title == null) {
    throw new Error("Missing element");
  }
  title.innerHTML = "Conversazioni";

  const content = document.getElementById("content");
  if (content == null) {
    throw new Error("Missing element");
  }
  content.innerHTML = `<p>Caricamento...</p>`;

  const errorMessage = document.getElementById("error_message");
  if (errorMessage == null) {
    throw new Error("Missing element");
  }
  errorMessage.innerHTML = "";

  fetch(CONVERSATIONS_URL + '?' + new URLSearchParams('token=' + token), {
    method: "GET",
  }).then(res => {
    console.log("Request complete! response:", res);
    if (res.body != null) {
      const reader = res.body.getReader()
      return reader.read().then(({ done, value }) => {
        const content = new TextDecoder().decode(value);
        if (res.status != 200) {
          return [null, { status: res.status, content }];
        } else {
          return [{ status: res.status, content }, null];
        }
      })
    }
    if (res.status != 200) {
      return [null, { status: res.status, content: '' }];
    } else {
      return [{ status: res.status, content: '' }, null];
    }
  }).then(([success, error]) => {
    if (error != null) {
      errorMessage.innerHTML = `Errore: (${error.status}), ${error.content}`;
      if (error.status == 401) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USERNAME_KEY);
        displayLogin();
        displayAnonymousLayout();
      }
      return;
    }

    if (success == null) {
      throw new Error("Success can't be null");
    }

    const conversationsResponse = JSON.parse(success.content);
    let contentHTML = `
    <div id="conversations">
    <table >
    <thead>
    <tr>
      <th>Numero</th>
      <th>Nome</th>
      <th>Operazioni</th>
    </tr>
    </thead>
    <tbody>`;
    conversationsResponse.Items.forEach((/** @type {Conversation} */ element) => {
      contentHTML += `
      <tr>
        <td>${element.from.S}</td>
        <td id="conversation_${element.from.S}_name">${element.name?.S ?? ''}</td>
        <td><button id="conversation_${element.from.S}_info">Dettagli</button></td>
      </tr>`;
    });
    contentHTML += `
    </tbody>
    </table>
    </div>
    <div id="conversation_details">
    </div>`;
    content.innerHTML = contentHTML;

    const conversationsTable = document.getElementById("conversations");
    const conversationDetails = document.getElementById("conversation_details");
    if (conversationDetails == null || conversationsTable == null) {
      throw new Error("Missing element");
    }

    conversationsResponse.Items.forEach((/** @type {Conversation} */ element) => {
      const infoButton = document.getElementById(`conversation_${element.from.S}_info`);
      if (infoButton == null || !(infoButton instanceof HTMLButtonElement)) {
        throw new Error("Missing element");
      }

      infoButton.addEventListener("click", function (event) {
        conversationsTable.style.display = "none";
        conversationDetails.style.display = "block";

        conversationDetails.innerHTML = "<p>Caricamento...</p>";

        fetch(CONVERSATION_URL + '?' + new URLSearchParams('token=' + token + '&from=' + element.from.S), {
          method: "GET",
        }).then(res => {
          console.log("Request complete! response:", res);
          if (res.body != null) {
            const reader = res.body.getReader()
            return reader.read().then(({ done, value }) => {
              const content = new TextDecoder().decode(value);
              if (res.status != 200) {
                return [null, { status: res.status, content }];
              } else {
                return [{ status: res.status, content }, null];
              }
            })
          }
          if (res.status != 200) {
            return [null, { status: res.status, content: '' }];
          } else {
            return [{ status: res.status, content: '' }, null];
          }
        }).then(([success, error]) => {
          if (error != null) {
            errorMessage.innerHTML = `Errore: (${error.status}), ${error.content}`;
            if (error.status == 401) {
              localStorage.removeItem(TOKEN_KEY);
              localStorage.removeItem(USERNAME_KEY);
              displayLogin();
              displayAnonymousLayout();
            }
            return;
          }

          if (success == null) {
            throw new Error("Success can't be null");
          }

          console.log(success, error);
          const conversationDetailsResponse = JSON.parse(success.content);
          displayConversationDetails(token, conversationDetailsResponse.Item);
        });
      });
    });
  });;
}

/**
 * @typedef {Object} Conversation
 * @prop {{S: string}} from
 * @prop {?{S: string}} name
 * @prop {?{S: string}} nextAppointment
 */

/**
 * @param {string} token
 * @param {Conversation} conversation
 */
function displayConversationDetails(token, conversation) {
  const conversationsTable = document.getElementById("conversations");
  const conversationDetails = document.getElementById("conversation_details");
  if (conversationDetails == null || conversationsTable == null) {
    throw new Error("Missing element");
  }

  conversationDetails.innerHTML = `
  <h2>Numero: ${conversation.from.S}</h2>
  <form id="conversation_details_form">
  <div><label>Nome</label><input type="text" id="name_input" name="from" value="${conversation.name?.S ?? ''}"/></div>
  <div><label>Prossimo appuntamento</label><input type="datetime-local" id="next_appointment_input" name="next_appointment" value="${conversation.nextAppointment?.S}"/></div>
  <div><input type="submit" id="update_conversation_details" value="Aggiorna" /></div>
  </form>
  <p><button id="close_conversation_details" class="primary">Chiudi</button></p>
  `;

  attachCloseConversationDetailsListener(conversationsTable, conversationDetails);
  attachUpdateConversationDetailsListener(token, conversationDetails, conversation);
}

/**
 * @param {HTMLElement} conversationsTable
 * @param {HTMLElement} conversationDetails
 */
function attachCloseConversationDetailsListener(conversationsTable, conversationDetails) {
  const closeConversationDetailsButton = document.getElementById("close_conversation_details");
  if (closeConversationDetailsButton == null) {
    throw new Error("Missing element");
  }

  closeConversationDetailsButton.addEventListener("click", function () {
    conversationsTable.style.display = "block";
    conversationDetails.style.display = "none";
  });
}

/**
 * @param {string} token
 * @param {HTMLElement} conversationDetails
 * @param {Conversation} conversation
 */
function attachUpdateConversationDetailsListener(token, conversationDetails, conversation) {
  const conversationDetailsForm = document.getElementById("conversation_details_form");
  if (conversationDetailsForm == null) {
    throw new Error("Missing element");
  }

  const errorMessage = document.getElementById("error_message");
  if (errorMessage == null) {
    throw new Error("Missing element");
  }
  errorMessage.innerHTML = "";

  conversationDetailsForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const nameInput = document.getElementById("name_input");
    const nextAppointmentInput = document.getElementById("next_appointment_input");
    if (nameInput == null || !(nameInput instanceof HTMLInputElement) || nextAppointmentInput == null || !(nextAppointmentInput instanceof HTMLInputElement)) {
      throw new Error("Missing element");
    }

    const submitButton = document.getElementById("update_conversation_details");
    if (submitButton == null || !(submitButton instanceof HTMLInputElement)) {
      throw new Error("Missing element");
    }

    submitButton.disabled = true;
    submitButton.value = "Caricamento...";

    fetch(CONVERSATION_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        conversation: { from: conversation.from.S, name: nameInput.value, next_appointment: nextAppointmentInput.value }
      })
    }).then(res => {
      console.log("Request complete! response:", res);
      if (res.body != null) {
        const reader = res.body.getReader()
        return reader.read().then(({ done, value }) => {
          const content = new TextDecoder().decode(value);
          if (res.status != 200) {
            return [null, { status: res.status, content }];
          } else {
            return [{ status: res.status, content }, null];
          }
        })
      }
      if (res.status != 200) {
        return [null, { status: res.status, content: '' }];
      } else {
        return [{ status: res.status, content: '' }, null];
      }
    }, error => [null, { status: -1, content: error }]
    ).then(([success, error]) => {
      if (error != null) {
        errorMessage.innerHTML = `Errore: (${error.status}), ${error.content}`;
        displayConversationDetails(token, conversation);
        return;
      }

      if (success == null) {
        throw new Error("Success can't be null");
      }

      const result = JSON.parse(success.content);
      const updatedConversation = result.Attributes;
      displayConversationDetails(token, updatedConversation);

      // Update stale data in conversations table
      const conversationName = document.getElementById(`conversation_${conversation.from.S}_name`);
      if (conversationName == null) {
        throw new Error("Missing element");
      }
      conversationName.innerHTML = updatedConversation.name.S;
    });
  });
}

function displayLogin() {
  const content = document.getElementById("content");
  if (content == null) {
    throw new Error("Missing element");
  }

  content.innerHTML = `
  <form id="login_form">
  <div><label>Nome utente</label><input type="text" id="username_input" name="username" /></div>
  <div><label>Password</label><input type="password" id="password_input" name="password" /></div>
  <div><input type="submit" id="login_button" value="Accedi" /></div>
  </form>`;

  attachLoginEventListener();
}

function displayAnonymousLayout() {
  const authenticatedMenuItem = document.getElementById("authenticated");
  if (authenticatedMenuItem == null) {
    throw new Error("Missing element");
  }
  authenticatedMenuItem.style.display = "none";

  const title = document.getElementById("title");
  if (title == null) {
    throw new Error("Missing element");
  }
  title.innerHTML = "Filo Diretto";

  const subtitle = document.getElementById("subtitle");
  if (subtitle == null) {
    throw new Error("Missing element");
  }
  subtitle.style.display = "block";
}

function displayAuthenticatedLayout(username) {
  const authenticatedMenuItem = document.getElementById("authenticated");
  if (authenticatedMenuItem == null) {
    throw new Error("Missing element");
  }
  authenticatedMenuItem.style.display = "block";

  const usernameMenuItem = document.getElementById("username");
  if (usernameMenuItem == null) {
    throw new Error("Missing element");
  }
  usernameMenuItem.innerHTML = username;

  const subtitle = document.getElementById("subtitle");
  if (subtitle == null) {
    throw new Error("Missing element");
  }
  subtitle.style.display = "none";

  attachLogoutEventListener();
}

function attachLoginEventListener() {
  const loginButton = document.getElementById("login_button");
  const loginForm = document.getElementById("login_form");
  if (loginButton == null || !(loginButton instanceof HTMLInputElement) || loginForm == null || !(loginForm instanceof HTMLFormElement)) {
    throw new Error("Missing element");
  }

  loginForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const errorMessage = document.getElementById("error_message");
    if (errorMessage == null) {
      throw new Error("Missing element");
    }
    errorMessage.innerHTML = "";

    const usernameInput = document.getElementById("username_input");
    const passwordInput = document.getElementById("password_input");
    if (usernameInput == null || !(usernameInput instanceof HTMLInputElement) || passwordInput == null || !(passwordInput instanceof HTMLInputElement)) {
      throw new Error("Missing element");
    }

    loginButton.disabled = true;
    loginButton.value = "Caricamento...";

    fetch(LOGIN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: usernameInput.value, password: passwordInput.value })
    }).then(res => {
      console.log("Request complete! response:", res);
      if (res.body != null) {
        const reader = res.body.getReader()
        return reader.read().then(({ done, value }) => {
          const content = new TextDecoder().decode(value);
          if (res.status != 200) {
            return [null, { status: res.status, content }];
          } else {
            return [{ status: res.status, content }, null];
          }
        })
      }
      if (res.status != 200) {
        return [null, { status: res.status, content: '' }];
      } else {
        return [{ status: res.status, content: '' }, null];
      }
    }, error => [null, { status: -1, content: error }]
    ).then(([success, error]) => {
      if (error != null) {
        errorMessage.innerHTML = `Errore: (${error.status}), ${error.content}`;
        displayLogin();
        return;
      }

      if (success == null) {
        throw new Error("Success can't be null");
      }

      let { token, username } = JSON.parse(success.content);
      token = JSON.stringify(token);
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USERNAME_KEY, username);
      displayConversations(token);
      displayAuthenticatedLayout(username);
    });
  });
}

function attachLogoutEventListener() {
  const logoutLink = document.getElementById("logout");
  if (logoutLink == null) {
    throw new Error("Missing element");
  }

  logoutLink.addEventListener("click", function (event) {
    event.preventDefault();
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USERNAME_KEY);
    displayLogin();
    displayAnonymousLayout();
  });
}

function main() {
  const token = localStorage.getItem(TOKEN_KEY);
  const username = localStorage.getItem(USERNAME_KEY);
  if (token != null && username != null) {
    displayConversations(token);
    displayAuthenticatedLayout(username);
  } else {
    displayLogin();
    displayAnonymousLayout();
  }
}

document.addEventListener("DOMContentLoaded", main);
