import json
import boto3
from common import auth
from common import cors

print('Loading function')

SENDERS_TABLE = "filoDirettoSenders"


@cors.access_control(methods={'GET'})
@auth.require_auth
def lambda_handler(event, context):
    print("Received event: " + json.dumps(event, indent=2))
    if event['httpMethod'] != 'GET':
        return {"statusCode": 400, "body": "HTTP method not supported"}

    dynamodb = boto3.client('dynamodb')
    results = dynamodb.scan(TableName=SENDERS_TABLE)
    
    return {"statusCode": 200, "body": json.dumps(results)}
