import json
import boto3
from common import auth

print('Loading function')

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'OPTIONS,GET,PUT,POST,DELETE',
    'Access-Control-Allow-Headers': 'Content-Type',
}
APPOINTMENTS_TABLE = "filoDirettoAppointments"


def lambda_handler(event, context):
    print("Received event: " + json.dumps(event, indent=2))
    if event['httpMethod'] == 'OPTIONS':
        return {"statusCode": 200, "body": "Ok", "headers": CORS_HEADERS}
    
    if event['httpMethod'] == 'GET':
        if 'token' not in event['queryStringParameters']:
            return {"statusCode": 400, "body": "Missing token param", "headers": CORS_HEADERS}
        
        if 'from' not in event['queryStringParameters']:
            return {"statusCode": 400, "body": "Missing from param", "headers": CORS_HEADERS}
        
        if 'datetime' not in event['queryStringParameters']:
            return {"statusCode": 400, "body": "Missing datetime param", "headers": CORS_HEADERS}
    
        token = json.loads(event['queryStringParameters']['token'])
        if not auth.is_token_valid(token):
            return {"statusCode": 401, "body": "Authentication failed", "headers": CORS_HEADERS}
    
        dynamodb = boto3.client('dynamodb')
        result = dynamodb.get_item(
            TableName=APPOINTMENTS_TABLE,
            Key={
                'from': {'S': event['queryStringParameters']['from']},
                'datetime': {'S': event['queryStringParameters']['datetime']},
            },
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
        
        if 'datetime' not in event['queryStringParameters']:
            return {"statusCode": 400, "body": "Missing datetime param", "headers": CORS_HEADERS}
    
        token = json.loads(event['queryStringParameters']['token'])
        if not auth.is_token_valid(token):
            return {"statusCode": 401, "body": "Authentication failed", "headers": CORS_HEADERS}
    
        dynamodb = boto3.client('dynamodb')
        result = dynamodb.delete_item(
            TableName=APPOINTMENTS_TABLE,
            Key={
                'from': {'S': event['queryStringParameters']['from']},
                'datetime': {'S': event['queryStringParameters']['datetime']},
            },
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
        # TODO: delete + update in a transaction
        # https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/dynamodb/client/transact_write_items.html
        # https://stackoverflow.com/questions/55474664/dynamoddb-how-to-update-sort-key
        # https://stackoverflow.com/questions/56709500/dynamodb-update-an-attribute-used-as-sort-key
        result = dynamodb.delete_item(
            TableName=APPOINTMENTS_TABLE,
            Key={
                'from': {'S': body['appointment']['from']},
                'datetime': {'S': body['appointment']['datetime']},
            }
        )
        result = dynamodb.put_item(
            TableName=APPOINTMENTS_TABLE,
            Item={
                'from': {'S': body['appointment']['from']},
                'datetime': {'S': body['appointment']['new_datetime']},
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
    elif event['httpMethod'] == 'POST':
        body = json.loads(event['body'])
        token = json.loads(body['token'])
        if not auth.is_token_valid(token):
            return {"statusCode": 401, "body": "Authentication failed", "headers": CORS_HEADERS}
        
        dynamodb = boto3.client('dynamodb')
        # Add a new appointment conditionally so we don't overwrite existing items
        result = dynamodb.put_item(
            TableName=APPOINTMENTS_TABLE,
            Item={
                'from': {'S': body['appointment']['from']},
                'datetime': {'S': body['appointment']['datetime']},
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
