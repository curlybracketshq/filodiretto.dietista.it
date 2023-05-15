import json
import boto3
from common import auth
from common import cors
from common import errors

print('Loading function')

SENDERS_TABLE = "filoDirettoSenders"


@cors.access_control(methods={'GET', 'PUT', 'POST', 'DELETE'})
@errors.notify_discord
@auth.require_auth
def lambda_handler(event, context):
    print("Received event: " + json.dumps(event, indent=2))
    if event['httpMethod'] == 'GET':
        if 'from' not in event['queryStringParameters']:
            return {"statusCode": 400, "body": "Missing from param"}

        dynamodb = boto3.client('dynamodb')
        result = dynamodb.get_item(
            TableName=SENDERS_TABLE,
            Key={'from': {'S': event['queryStringParameters']['from']}},
        )

        if 'Item' not in result:
            return {"statusCode": 404, "body": "Item not found"}
        
        return {"statusCode": 200, "body": json.dumps(result)}
    elif event['httpMethod'] == 'DELETE':
        if 'from' not in event['queryStringParameters']:
            return {"statusCode": 400, "body": "Missing from param"}

        dynamodb = boto3.client('dynamodb')
        result = dynamodb.delete_item(
            TableName=SENDERS_TABLE,
            Key={'from': {'S': event['queryStringParameters']['from']}},
        )
        
        return {"statusCode": 200, "body": json.dumps(result)}
    elif event['httpMethod'] == 'PUT':
        body = json.loads(event['body'])

        dynamodb = boto3.client('dynamodb')
        kwargs = {
            'TableName': SENDERS_TABLE,
            'Key': {'from': {'S': body['conversation']['from']}},
            'ReturnValues': 'ALL_NEW',
            'ConditionExpression': '#F = :f',
        }

        if 'weights' in body['conversation']:
            kwargs['ExpressionAttributeNames'] = {
                '#F': 'from',
                '#W': 'weights',
            }
            kwargs['ExpressionAttributeValues'] = {
                ':f': {'S': body['conversation']['from']},
                ':w': {'S': body['conversation']['weights']},
            }
            kwargs['UpdateExpression'] = 'SET #W = :w'
        elif 'waist_hips' in body['conversation']:
            kwargs['ExpressionAttributeNames'] = {
                '#F': 'from',
                '#W': 'waistHips',
            }
            kwargs['ExpressionAttributeValues'] = {
                ':f': {'S': body['conversation']['from']},
                ':w': {'S': body['conversation']['waist_hips']},
            }
            kwargs['UpdateExpression'] = 'SET #W = :w'
        else:
            kwargs['ExpressionAttributeNames'] = {
                '#F': 'from',
                '#FN': 'firstName',
                '#LN': 'lastName',
                '#E': 'email',
                '#H': 'height',
                '#BD': 'birthDate',
                '#G': 'gender',
                '#N': 'notes',
            }
            height = body['conversation'].get('height', '')
            kwargs['ExpressionAttributeValues'] = {
                ':f': {'S': body['conversation']['from']},
                ':fn': {'S': body['conversation'].get('first_name', '')},
                ':ln': {'S': body['conversation'].get('last_name', '')},
                ':e': {'S': body['conversation'].get('email', '')},
                ':h': {'N': height} if len(height) > 0 else {'NULL': True},
                ':bd': {'S': body['conversation'].get('birth_date', '')},
                ':g': {'S': body['conversation'].get('gender', '')},
                ':n': {'S': body['conversation'].get('notes', '')},
            }
            kwargs['UpdateExpression'] = 'SET #FN = :fn, #LN = :ln, #E = :e, #H = :h, #BD = :bd, #G = :g, #N = :n'

        result = dynamodb.update_item(**kwargs)

        return {"statusCode": 200, "body": json.dumps(result)}
    elif event['httpMethod'] == 'POST':
        body = json.loads(event['body'])

        dynamodb = boto3.client('dynamodb')
        height = body['conversation'].get('height', '')
        # Add a new sender conditionally so we don't overwrite existing items
        result = dynamodb.put_item(
            TableName=SENDERS_TABLE,
            Item={
                'from': {'S': body['conversation']['from']},
                'firstName': {'S': body['conversation'].get('first_name', '')},
                'lastName': {'S': body['conversation'].get('last_name', '')},
                'email': {'S': body['conversation'].get('email', '')},
                'height': {'N': height} if len(height) > 0 else {'NULL': True},
                'birthDate': {'S': body['conversation'].get('birth_date', '')},
                'gender': {'S': body['conversation'].get('gender', '')},
                'notes': {'S': body['conversation'].get('notes', '')},
            },
            ExpressionAttributeNames={
                '#F': 'from',
            },
            ConditionExpression='attribute_not_exists(#F)',
        )

        return {"statusCode": 200, "body": json.dumps(result)}
    else:
        return {"statusCode": 405, "body": "Method not allowed"}
