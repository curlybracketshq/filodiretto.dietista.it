import json
import boto3
import datetime
from common import auth

print('Loading function')

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'OPTIONS,GET',
    'Access-Control-Allow-Headers': 'Content-Type',
}
APPOINTMENTS_TABLE = "filoDirettoAppointments"


def lambda_handler(event, context):
    print("Received event: " + json.dumps(event, indent=2))
    if event['httpMethod'] == 'OPTIONS':
        return {"statusCode": 200, "body": "Ok", "headers": CORS_HEADERS}

    if event['httpMethod'] != 'GET':
        return {"statusCode": 400, "body": "HTTP method not supported", "headers": CORS_HEADERS}

    if 'token' not in event['queryStringParameters']:
        return {"statusCode": 400, "body": "Missing token param", "headers": CORS_HEADERS}
    
    if 'from' not in event['queryStringParameters']:
        return {"statusCode": 400, "body": "Missing from param", "headers": CORS_HEADERS}

    token = json.loads(event['queryStringParameters']['token'])
    if not auth.is_token_valid(token):
        return {"statusCode": 401, "body": "Authentication failed", "headers": CORS_HEADERS}

    dynamodb = boto3.client('dynamodb')
    results = dynamodb.query(
        TableName=APPOINTMENTS_TABLE,
        ExpressionAttributeValues={
            ':f': {'S': event['queryStringParameters']['from']},
            ':today': {'S': datetime.date.today().isoformat()},
        },
        ExpressionAttributeNames={
            '#F': 'from',
            '#DT': 'datetime',
        },
        KeyConditionExpression='#F = :f AND #DT >= :today',
        Limit=1,
    )
    
    return {
        "statusCode": 200,
        "body": json.dumps(results),
        "headers": CORS_HEADERS,
    }