import json
import boto3
from common import auth

print('Loading function')

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'OPTIONS,GET,PUT,POST,DELETE',
    'Access-Control-Allow-Headers': 'Content-Type',
}
SENDERS_TABLE = "filoDirettoSenders"


def lambda_handler(event, context):
    print("Received event: " + json.dumps(event, indent=2))
    if event['httpMethod'] == 'OPTIONS':
        return {"statusCode": 200, "body": "Ok", "headers": CORS_HEADERS}
    
    if event['httpMethod'] == 'GET':
        if 'token' not in event['queryStringParameters']:
            return {"statusCode": 400, "body": "Missing token param", "headers": CORS_HEADERS}
        
        if 'from' not in event['queryStringParameters']:
            return {"statusCode": 400, "body": "Missing from param", "headers": CORS_HEADERS}
    
        token = json.loads(event['queryStringParameters']['token'])
        if not auth.is_token_valid(token):
            return {"statusCode": 401, "body": "Authentication failed", "headers": CORS_HEADERS}
    
        dynamodb = boto3.client('dynamodb')
        result = dynamodb.get_item(
            TableName=SENDERS_TABLE,
            Key={'from': {'S': event['queryStringParameters']['from']}},
        )
        
        return {
            "statusCode": 200,
            "body": json.dumps(result),
            "headers": CORS_HEADERS,
        }
    elif event['httpMethod'] == 'DELETE':
        if 'token' not in event['queryStringParameters']:
            return {"statusCode": 400, "body": "Missing token param", "headers": CORS_HEADERS}
        
        if 'from' not in event['queryStringParameters']:
            return {"statusCode": 400, "body": "Missing from param", "headers": CORS_HEADERS}
    
        token = json.loads(event['queryStringParameters']['token'])
        if not auth.is_token_valid(token):
            return {"statusCode": 401, "body": "Authentication failed", "headers": CORS_HEADERS}
    
        dynamodb = boto3.client('dynamodb')
        result = dynamodb.delete_item(
            TableName=SENDERS_TABLE,
            Key={'from': {'S': event['queryStringParameters']['from']}},
        )
        
        return {
            "statusCode": 200,
            "body": json.dumps(result),
            "headers": CORS_HEADERS,
        }
    elif event['httpMethod'] == 'PUT':
        body = json.loads(event['body'])
        token = json.loads(body['token'])
        if not auth.is_token_valid(token):
            return {"statusCode": 401, "body": "Authentication failed", "headers": CORS_HEADERS}
        
        dynamodb = boto3.client('dynamodb')
        result = dynamodb.update_item(
            TableName=SENDERS_TABLE,
            ExpressionAttributeNames={
                '#F': 'from',
                '#FN': 'firstName',
                '#LN': 'lastName',
                '#N': 'notes',
            },
            ExpressionAttributeValues={
                ':f': {'S': body['conversation']['from']},
                ':fn': {'S': body['conversation'].get('first_name', '')},
                ':ln': {'S': body['conversation'].get('last_name', '')},
                ':n': {'S': body['conversation'].get('notes', '')},
            },
            Key={
                'from': {'S': body['conversation']['from']},
            },
            ReturnValues='ALL_NEW',
            UpdateExpression='SET #FN = :fn, #LN = :ln, #N = :n',
            ConditionExpression='#F = :f',
        )

        return {
            "statusCode": 200,
            "body": json.dumps(result),
            "headers": CORS_HEADERS,
        }
    elif event['httpMethod'] == 'POST':
        body = json.loads(event['body'])
        token = json.loads(body['token'])
        if not auth.is_token_valid(token):
            return {"statusCode": 401, "body": "Authentication failed", "headers": CORS_HEADERS}
        
        dynamodb = boto3.client('dynamodb')
        # Add a new sender conditionally so we don't overwrite existing items
        result = dynamodb.put_item(
            TableName=SENDERS_TABLE,
            Item={
                'from': {'S': body['conversation']['from']},
                'firstName': {'S': body['conversation'].get('first_name', '')},
                'lastName': {'S': body['conversation'].get('last_name', '')},
                'notes': {'S': body['conversation'].get('notes', '')},
            },
            ExpressionAttributeNames={
                '#F': 'from',
            },
            ConditionExpression='attribute_not_exists(#F)',
        )

        return {
            "statusCode": 200,
            "body": json.dumps(result),
            "headers": CORS_HEADERS,
        }
    else:
        return {"statusCode": 400, "body": "HTTP method not supported", "headers": CORS_HEADERS}
