import json
import time
import os
from common import auth
from common import cors
from common import errors
from common import logging

print('Loading function')

CREDENTIALS = json.loads(os.environ['AUTH_CREDENTIALS'])


@cors.access_control(methods={'POST'})
@errors.notify_discord
@logging.log_event
def lambda_handler(event, context):
    if event['httpMethod'] != 'POST':
        return {"statusCode": 405, "body": "Method not allowed"}

    body = json.loads(event['body'])
    username = body['username']
    password = body['password']
    if username not in CREDENTIALS:
        return {"statusCode": 401, "body": "Authentication failed"}

    creds = CREDENTIALS[username]
    if password != creds['password']:
        return {"statusCode": 401, "body": "Authentication failed"}

    current_timestamp = int(time.time())
    token = auth.generate_token(username, creds['is_admin'], current_timestamp)
    return {
        "statusCode": 200,
        "body": json.dumps({
            "token": token,
            "username": body["username"],
        }),
    }
