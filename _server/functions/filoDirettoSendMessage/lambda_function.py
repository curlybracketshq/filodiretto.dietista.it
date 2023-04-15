import json
from common import auth
from common import cors
from common import errors
from common import whatsapp

print('Loading function')


@cors.access_control(methods={'POST'})
@errors.notify_discord
@auth.require_auth
def lambda_handler(event, context):
    print("Received event: " + json.dumps(event, indent=2))
    if event['httpMethod'] != 'POST':
        return {"statusCode": 405, "body": "Method not allowed"}

    body = json.loads(event['body'])
    whatsapp.send_message(body['to'], body['content'])

    return {"statusCode": 200, "body": "Ok"}
