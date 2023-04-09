import json
import boto3
from common import auth
from common import cors

print('Loading function')

SENDERS_TABLE = "filoDirettoSenders"


@cors.access_control(methods={'GET'})
def lambda_handler(event, context):
    print("Received event: " + json.dumps(event, indent=2))
    if event['httpMethod'] != 'GET':
        return {"statusCode": 400, "body": "HTTP method not supported"}

    if 'token' not in event['queryStringParameters']:
        return {"statusCode": 400, "body": "Missing token param"}

    token = json.loads(event['queryStringParameters']['token'])
    if not auth.is_token_valid(token):
        return {"statusCode": 401, "body": "Authentication failed"}

    dynamodb = boto3.client('dynamodb')
    results = dynamodb.scan(TableName=SENDERS_TABLE)
    
    return {"statusCode": 200, "body": json.dumps(results)}
