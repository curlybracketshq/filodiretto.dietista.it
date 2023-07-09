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

    if 'from' in event['queryStringParameters']:
        kwargs['number'] = event['queryStringParameters']['from']
    elif 'month' in event['queryStringParameters'] and 'before' in event['queryStringParameters'] and 'after' in event['queryStringParameters']:
        kwargs['month'] = event['queryStringParameters']['month']
        kwargs['before'] = event['queryStringParameters']['before']
        kwargs['after'] = event['queryStringParameters']['after']

    results = db.query_appointments(**kwargs)
    
    return {"statusCode": 200, "body": json.dumps(results)}
