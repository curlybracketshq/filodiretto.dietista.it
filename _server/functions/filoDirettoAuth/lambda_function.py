import json
import time
import os
from common import auth
from common import cors
from common import errors

print('Loading function')

CREDENTIALS = json.loads(os.environ['AUTH_CREDENTIALS'])


@cors.access_control(methods={'POST'})
@errors.notify_discord
def lambda_handler(event, context):
    print("Received event: " + json.dumps(event, indent=2))
    if event['httpMethod'] != 'POST':
        return {"statusCode": 405, "body": "Method not allowed"}

    body = json.loads(event['body'])
    if body['username'] not in CREDENTIALS or body['password'] != CREDENTIALS[body['username']]:
        return {"statusCode": 401, "body": "Authentication failed"}

    current_timestamp = int(time.time())
    token = auth.generate_token(body['username'], current_timestamp)
    return {
        "statusCode": 200,
        "body": json.dumps({
            "token": token,
            "username": body["username"],
        }),
    }
