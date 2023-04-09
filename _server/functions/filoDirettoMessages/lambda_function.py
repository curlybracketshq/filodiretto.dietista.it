import json
import boto3
from common import auth
from common import cors

print('Loading function')

MESSAGES_TABLE = "filoDirettoMessages"


@cors.access_control(methods={'GET'})
def lambda_handler(event, context):
    print("Received event: " + json.dumps(event, indent=2))
    if event['httpMethod'] != 'GET':
        return {"statusCode": 400, "body": "HTTP method not supported"}

    if 'token' not in event['queryStringParameters']:
        return {"statusCode": 400, "body": "Missing token param"}

    if 'from' not in event['queryStringParameters']:
        return {"statusCode": 400, "body": "Missing from param"}

    token = json.loads(event['queryStringParameters']['token'])
    if not auth.is_token_valid(token):
        return {"statusCode": 401, "body": "Authentication failed"}

    dynamodb = boto3.client('dynamodb')
    results = dynamodb.query(
        TableName=MESSAGES_TABLE,
        ExpressionAttributeValues={
            ':f': {'S': event['queryStringParameters']['from']},
        },
        ExpressionAttributeNames={
            '#F': 'from',
        },
        KeyConditionExpression='#F = :f',
        ScanIndexForward=False,
    )

    return {"statusCode": 200, "body": json.dumps(results)}
