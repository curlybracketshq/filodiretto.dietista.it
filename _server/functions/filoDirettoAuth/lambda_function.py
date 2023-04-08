import json
import time
import hashlib
import secrets
import os

print('Loading function')

CREDENTIALS = json.loads(os.environ['AUTH_CREDENTIALS'])
SECRET = os.environ['AUTH_SECRET'].encode('utf-8')
CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'OPTIONS,POST',
    'Access-Control-Allow-Headers': 'Content-Type',
}


def lambda_handler(event, context):
    print("Received event: " + json.dumps(event, indent=2))
    if event['httpMethod'] == 'OPTIONS':
        return {"statusCode": 200, "body": "Ok", "headers": CORS_HEADERS}

    if event['httpMethod'] != 'POST':
        return {"statusCode": 400, "body": "HTTP method not supported", "headers": CORS_HEADERS}

    body = json.loads(event['body'])
    if body['username'] in CREDENTIALS and body['password'] == CREDENTIALS[body['username']]:
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
            "headers": CORS_HEADERS,
        }

    return {"statusCode": 401, "body": "Authentication failed", "headers": CORS_HEADERS}