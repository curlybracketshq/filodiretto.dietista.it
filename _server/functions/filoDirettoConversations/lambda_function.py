import json
import hashlib
import boto3
import os

print('Loading function')

SECRET = os.environ['AUTH_SECRET'].encode('utf-8')
CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'OPTIONS,GET',
    'Access-Control-Allow-Headers': 'Content-Type',
}
SENDERS_TABLE = "filoDirettoSenders"


def lambda_handler(event, context):
    print("Received event: " + json.dumps(event, indent=2))
    if event['httpMethod'] == 'OPTIONS':
        return {"statusCode": 200, "body": "Ok", "headers": CORS_HEADERS}

    if event['httpMethod'] != 'GET':
        return {"statusCode": 400, "body": "HTTP method not supported", "headers": CORS_HEADERS}

    if 'token' not in event['queryStringParameters']:
        return {"statusCode": 400, "body": "Missing token param", "headers": CORS_HEADERS}

    token = json.loads(event['queryStringParameters']['token'])
    print(token)
    m = hashlib.sha256()
    m.update(token['timestamp'].encode('utf-8'))
    m.update(token['nonce'].encode('utf-8'))
    m.update(SECRET)
    signature = m.hexdigest()
    if signature != token['signature']:
        return {"statusCode": 401, "body": "Authentication failed", "headers": CORS_HEADERS}

    dynamodb = boto3.client('dynamodb')
    results = dynamodb.scan(TableName=SENDERS_TABLE)
    
    return {
        "statusCode": 200,
        "body": json.dumps(results),
        "headers": CORS_HEADERS,
    }
