import json
from common import auth
from common import cors
from common import errors
from common import db

print('Loading function')

MESSAGES_TABLE = "filoDirettoMessages"


@cors.access_control(methods={'GET'})
@errors.notify_discord
@auth.require_auth
def lambda_handler(event, context):
    print("Received event: " + json.dumps(event, indent=2))
    if event['httpMethod'] != 'GET':
        return {"statusCode": 405, "body": "Method not allowed"}

    if 'from' not in event['queryStringParameters']:
        return {"statusCode": 400, "body": "Missing from param"}

    kwargs = {
        'number': event['queryStringParameters']['from'],
    }

    if 'last_evaluated_key' in event['queryStringParameters']:
        kwargs['exclusive_start_key'] = json.loads(event['queryStringParameters']['last_evaluated_key'])

    if 'limit' in event['queryStringParameters']:
        kwargs['limit'] = int(event['queryStringParameters']['limit'])

    results = db.query_messages(**kwargs)

    return {"statusCode": 200, "body": json.dumps(results)}
