import json
import http.client
import os
from common import db

PHONE_NUMBER_ID = os.environ['WA_PHONE_NUMBER_ID']
ACCESS_TOKEN = os.environ['WA_ACCESS_TOKEN']


def send_message(recipient, message):
    params = json.dumps({
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": recipient,
        "type": "text",
        "text": {
            "preview_url": True,
            "body": message,
        },
    })
    headers = {"Content-type": "application/json", "Authorization": "Bearer " + ACCESS_TOKEN}
    conn = http.client.HTTPSConnection("graph.facebook.com")
    conn.request("POST", "/v16.0/" + PHONE_NUMBER_ID + "/messages", params, headers)
    response = conn.getresponse()
    print(response.status, response.reason)
    data = response.read()
    print("Response body:")
    print(data)
    conn.close()

    if response.status != 200:
        return

    db.put_message(recipient, message)
