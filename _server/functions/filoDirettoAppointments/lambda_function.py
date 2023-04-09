import json
import boto3
from common import auth
from common import cors

print('Loading function')

APPOINTMENTS_TABLE = "filoDirettoAppointments"


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
    
    if 'from' in event['queryStringParameters']:
        results = dynamodb.query(
            TableName=APPOINTMENTS_TABLE,
            ExpressionAttributeValues={
                ':f': {'S': event['queryStringParameters']['from']},
            },
            ExpressionAttributeNames={
                '#F': 'from',
            },
            KeyConditionExpression='#F = :f',
        )
    else:
        results = dynamodb.scan(TableName=APPOINTMENTS_TABLE)
    
    return {"statusCode": 200, "body": json.dumps(results)}
