import json
import http.client


def send_message(webhook_id, webhook_token, content):
    params = json.dumps({"content": content})
    headers = {"Content-type": "application/json"}
    conn = http.client.HTTPSConnection("discord.com")
    conn.request("POST", "/api/webhooks/" + webhook_id + "/" + webhook_token, params, headers)
    response = conn.getresponse()
    print(response.status, response.reason)
    data = response.read()
    print("Response body:")
    print(data)
    conn.close()
