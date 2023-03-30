//@ts-check

const TOKEN_KEY = 'TOKEN';
const USERNAME_KEY = 'USERNAME';

const LOGIN_URL = "https://08b499nwhf.execute-api.us-east-1.amazonaws.com/default/filoDirettoAuth";
const CONVERSATIONS_URL = "https://08b499nwhf.execute-api.us-east-1.amazonaws.com/default/filoDirettoConversations";
const CONVERSATION_URL = "https://08b499nwhf.execute-api.us-east-1.amazonaws.com/default/filoDirettoConversation";

/**
 * @param {string} [token]
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
      <th>Mittente</th>
      <th>Operazioni</th>
    </tr>
    </thead>
    <tbody>`;
    conversationsResponse.Items.forEach((/** @type {{ from: { S: string; }; }} */ element) => {
      contentHTML += `
      <tr>
        <td>${element.from.S}</td>
        <td><button id="sender_${element.from.S}_info">Dettagli</button></td>
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

    conversationsResponse.Items.forEach((/** @type {{ from: { S: string; }; }} */ element) => {
      const infoButton = document.getElementById(`sender_${element.from.S}_info`);
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
          displayConversationDetails(conversationDetailsResponse.Item);
        });
      });
    });
  });;
}

/**
 * @param {{from: {S: string;};name: ?{S: string;};nextAppointment: ?{S: string;};}} conversation
 */
function displayConversationDetails(conversation) {
  const conversationsTable = document.getElementById("conversations");
  const conversationDetails = document.getElementById("conversation_details");
  if (conversationDetails == null || conversationsTable == null) {
    throw new Error("Missing element");
  }

  conversationDetails.innerHTML = `
  <p>Numero: ${conversation.from.S}</p>
  <p>Nome: ${conversation.name?.S ?? '<em>non definito</em>'}</p>
  <p>Prossimo appuntamento: ${conversation.nextAppointment?.S ?? '<em>non definito</em>'}</p>
  <p><button id="close_conversation_details">Chiudi</button></p>
  `;

  attachCloseConversationDetailsListener(conversationsTable, conversationDetails);
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
