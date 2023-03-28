//@ts-check

const TOKEN_KEY = 'TOKEN';

const LOGIN_URL = "https://08b499nwhf.execute-api.us-east-1.amazonaws.com/default/filoDirettoAuth";
const CONVERSATIONS_URL = "https://08b499nwhf.execute-api.us-east-1.amazonaws.com/default/filoDirettoConversations";

/**
 * @param {string} [token]
 */
function displayConversations(token) {
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
        displayLogin();
      }
      return;
    }

    if (success == null) {
      throw new Error("Success can't be null");
    }

    const sendersResponse = JSON.parse(success?.content);
    let contentHTML = `
    <table>
    <thead>
    <tr><th>Mittente</th></tr>
    </thead>
    <tbody>`;
    sendersResponse.Items.forEach(element => {
      contentHTML += `<tr><td>${element.from.S}</td></tr>`;
    });
    contentHTML += `
    </tbody>
    </table>`;
    content.innerHTML = contentHTML;
  });;
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

      localStorage.setItem(TOKEN_KEY, success?.content);
      displayConversations();
    });
  });
}

function main() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token != null) {
    displayConversations(token);
  } else {
    displayLogin();
  }
}

document.addEventListener("DOMContentLoaded", main);
