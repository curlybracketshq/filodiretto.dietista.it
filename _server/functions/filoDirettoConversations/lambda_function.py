import json
import boto3
from common import auth
from common import cors
from common import errors

print('Loading function')

SENDERS_TABLE = "filoDirettoSenders"


@cors.access_control(methods={'GET'})
@errors.notify_discord
@auth.require_auth
def lambda_handler(event, context):
    print("Received event: " + json.dumps(event, indent=2))
    if event['httpMethod'] != 'GET':
        return {"statusCode": 405, "body": "Method not allowed"}

    dynamodb = boto3.client('dynamodb')
    kwargs = {'TableName': SENDERS_TABLE}

    if 'last_evaluated_key' in event['queryStringParameters']:
        kwargs['ExclusiveStartKey'] = json.loads(event['queryStringParameters']['last_evaluated_key'])

    if 'fields' in event['queryStringParameters']:
        # Include primary key by default
        fields = {'from'}
        fields |= set(event['queryStringParameters']['fields'].split(','))
        kwargs['ExpressionAttributeNames'] = {f"#F{i}": f for i, f in enumerate(fields)}
        kwargs['ProjectionExpression'] = ", ".join(kwargs['ExpressionAttributeNames'].keys())

    results = dynamodb.scan(**kwargs)
    
    return {"statusCode": 200, "body": json.dumps(results)}
