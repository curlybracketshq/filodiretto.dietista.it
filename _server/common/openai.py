import json
import http.client
import os

CHATGPT_API_KEY = os.environ['CHATGPT_API_KEY']
CHATGPT_SYSTEM_PROMPT_1 = os.environ['CHATGPT_SYSTEM_PROMPT_1']
CHATGPT_SYSTEM_PROMPT_2 = os.environ['CHATGPT_SYSTEM_PROMPT_2']


def chat_completions(message):
    params = json.dumps({
        "model": "gpt-3.5-turbo",
        "messages": [
            {"role": "system", "content": CHATGPT_SYSTEM_PROMPT_1},
            {"role": "system", "content": CHATGPT_SYSTEM_PROMPT_2},
            {"role": "user", "content": message},
        ],
    })

    headers = {"Content-type": "application/json", "Authorization": "Bearer " + CHATGPT_API_KEY}
    conn = http.client.HTTPSConnection("api.openai.com")
    conn.request("POST", "/v1/chat/completions", params, headers)
    response = conn.getresponse()
    print(response.status, response.reason)
    data = response.read()
    print("Response body:")
    print(data)
    conn.close()
    return json.loads(data.decode('utf-8'))
