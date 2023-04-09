import json
import boto3
from common import auth
from common import cors

print('Loading function')

APPOINTMENTS_TABLE = "filoDirettoAppointments"


@cors.access_control(methods={'GET', 'PUT', 'POST', 'DELETE'})
def lambda_handler(event, context):
    print("Received event: " + json.dumps(event, indent=2))
    if event['httpMethod'] == 'GET':
        if 'token' not in event['queryStringParameters']:
            return {"statusCode": 400, "body": "Missing token param"}
        
        if 'from' not in event['queryStringParameters']:
            return {"statusCode": 400, "body": "Missing from param"}
        
        if 'datetime' not in event['queryStringParameters']:
            return {"statusCode": 400, "body": "Missing datetime param"}
    
        token = json.loads(event['queryStringParameters']['token'])
        if not auth.is_token_valid(token):
            return {"statusCode": 401, "body": "Authentication failed"}
    
        dynamodb = boto3.client('dynamodb')
        result = dynamodb.get_item(
            TableName=APPOINTMENTS_TABLE,
            Key={
                'from': {'S': event['queryStringParameters']['from']},
                'datetime': {'S': event['queryStringParameters']['datetime']},
            },
        )
        
        return {"statusCode": 200, "body": json.dumps(result)}
    elif event['httpMethod'] == 'DELETE':
        if 'token' not in event['queryStringParameters']:
            return {"statusCode": 400, "body": "Missing token param"}
        
        if 'from' not in event['queryStringParameters']:
            return {"statusCode": 400, "body": "Missing from param"}
        
        if 'datetime' not in event['queryStringParameters']:
            return {"statusCode": 400, "body": "Missing datetime param"}
    
        token = json.loads(event['queryStringParameters']['token'])
        if not auth.is_token_valid(token):
            return {"statusCode": 401, "body": "Authentication failed"}
    
        dynamodb = boto3.client('dynamodb')
        result = dynamodb.delete_item(
            TableName=APPOINTMENTS_TABLE,
            Key={
                'from': {'S': event['queryStringParameters']['from']},
                'datetime': {'S': event['queryStringParameters']['datetime']},
            },
        )
        
        return {"statusCode": 200, "body": json.dumps(result)}
    elif event['httpMethod'] == 'PUT':
        body = json.loads(event['body'])
        token = json.loads(body['token'])
        if not auth.is_token_valid(token):
            return {"statusCode": 401, "body": "Authentication failed"}
        
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

        return {"statusCode": 200, "body": json.dumps(result)}
    elif event['httpMethod'] == 'POST':
        body = json.loads(event['body'])
        token = json.loads(body['token'])
        if not auth.is_token_valid(token):
            return {"statusCode": 401, "body": "Authentication failed"}
        
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

        return {"statusCode": 200, "body": json.dumps(result)}
    else:
        return {"statusCode": 400, "body": "HTTP method not supported"}
