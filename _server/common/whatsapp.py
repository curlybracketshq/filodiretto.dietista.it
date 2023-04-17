import json
import http.client
import boto3
from datetime import datetime, timezone
import os
import uuid

PHONE_NUMBER_ID = os.environ['WA_PHONE_NUMBER_ID']
ACCESS_TOKEN = os.environ['WA_ACCESS_TOKEN']

MESSAGES_TABLE = "filoDirettoMessages"


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

    dynamodb = boto3.client('dynamodb')
    dynamodb.put_item(
        TableName=MESSAGES_TABLE,
        Item={
            # A bit confusing, but this is the primary key
            'from': {'S': recipient},
            'timestamp': {'S': str(int(datetime.now(timezone.utc).timestamp()))},
            'id': {'S': str(uuid.uuid4())},
            # Use the same format as Whatsapp messages for convenience
            'text': {'S': json.dumps({'body': message})},
            # Used to disambiguate messages send by the system
            'source': {'S': 'filodiretto'},
        },
    )
