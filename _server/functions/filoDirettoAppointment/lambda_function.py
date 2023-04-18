import json
import boto3
from datetime import datetime
from common import auth
from common import cors
from common import errors

print('Loading function')

APPOINTMENTS_TABLE = "filoDirettoAppointments"


@cors.access_control(methods={'GET', 'PUT', 'POST', 'DELETE'})
@errors.notify_discord
@auth.require_auth
def lambda_handler(event, context):
    print("Received event: " + json.dumps(event, indent=2))
    if event['httpMethod'] == 'GET':
        if 'from' not in event['queryStringParameters']:
            return {"statusCode": 400, "body": "Missing from param"}
        
        if 'datetime' not in event['queryStringParameters']:
            return {"statusCode": 400, "body": "Missing datetime param"}
    
        dynamodb = boto3.client('dynamodb')
        result = dynamodb.get_item(
            TableName=APPOINTMENTS_TABLE,
            Key={
                'from': {'S': event['queryStringParameters']['from']},
                'datetime': {'S': event['queryStringParameters']['datetime']},
            },
        )

        if 'Item' not in result:
            return {"statusCode": 404, "body": "Item not found"}
        
        return {"statusCode": 200, "body": json.dumps(result)}
    elif event['httpMethod'] == 'DELETE':
        if 'from' not in event['queryStringParameters']:
            return {"statusCode": 400, "body": "Missing from param"}
        
        if 'datetime' not in event['queryStringParameters']:
            return {"statusCode": 400, "body": "Missing datetime param"}

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
        
        dynamodb = boto3.client('dynamodb')

        item = {
            'from': {'S': body['appointment']['from']},
            'datetime': {'S': body['appointment']['datetime']},
            'type': {'S': body['appointment']['appointment_type']},
        }

        # Set reminder sent at now arbitrarily if the "reminder sent" checkbox
        # is marked
        if body['appointment']['reminder_sent']:
            item['reminderSentAt'] = {'S': datetime.now().isoformat(timespec='minutes')}

        # Add a new appointment conditionally so we don't overwrite existing items
        result = dynamodb.put_item(
            TableName=APPOINTMENTS_TABLE,
            Item=item,
            ExpressionAttributeNames={
                '#F': 'from',
            },
            ConditionExpression='attribute_not_exists(#F)',
        )

        return {"statusCode": 200, "body": json.dumps(result)}
    else:
        return {"statusCode": 405, "body": "Method not allowed"}
