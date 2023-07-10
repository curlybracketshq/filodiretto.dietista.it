import json
from common import auth
from common import cors
from common import errors
from common import db

print('Loading function')


@cors.access_control(methods={'GET'})
@errors.notify_discord
@auth.require_auth
def lambda_handler(event, context):
    print("Received event: " + json.dumps(event, indent=2))
    if event['httpMethod'] != 'GET':
        return {"statusCode": 405, "body": "Method not allowed"}

    kwargs = {}

    if 'last_evaluated_key' in event['queryStringParameters']:
        kwargs['exclusive_start_key'] = json.loads(event['queryStringParameters']['last_evaluated_key'])

    if 'fields' in event['queryStringParameters']:
        kwargs['fields'] = set(event['queryStringParameters']['fields'].split(','))

    results = db.query_senders(**kwargs)
    
    return {"statusCode": 200, "body": json.dumps(results)}
