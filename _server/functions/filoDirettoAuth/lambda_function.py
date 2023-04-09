import json
import time
import hashlib
import secrets
import os
from common import cors

print('Loading function')

CREDENTIALS = json.loads(os.environ['AUTH_CREDENTIALS'])
SECRET = os.environ['AUTH_SECRET'].encode('utf-8')


@cors.access_control(methods={'POST'})
def lambda_handler(event, context):
    print("Received event: " + json.dumps(event, indent=2))
    if event['httpMethod'] != 'POST':
        return {"statusCode": 400, "body": "HTTP method not supported"}

    body = json.loads(event['body'])
    if body['username'] not in CREDENTIALS or body['password'] != CREDENTIALS[body['username']]:
        return {"statusCode": 401, "body": "Authentication failed"}

    timestamp = str(int(time.time()))
    nonce = secrets.token_hex(16)
    m = hashlib.sha256()
    m.update(timestamp.encode('utf-8'))
    m.update(nonce.encode('utf-8'))
    m.update(SECRET)
    signature = m.hexdigest()
    return {
        "statusCode": 200,
        "body": json.dumps({
            "token": {"signature": signature, "timestamp": timestamp, "nonce": nonce},
            "username": body["username"],
        }),
    }
