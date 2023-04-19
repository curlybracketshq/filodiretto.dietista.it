import json
import boto3
from common import auth
from common import cors
from common import errors

print('Loading function')

APPOINTMENTS_TABLE = "filoDirettoAppointments"


@cors.access_control(methods={'GET'})
@errors.notify_discord
@auth.require_auth
def lambda_handler(event, context):
    print("Received event: " + json.dumps(event, indent=2))
    if event['httpMethod'] != 'GET':
        return {"statusCode": 405, "body": "Method not allowed"}

    dynamodb = boto3.client('dynamodb')

    kwargs = {'TableName': APPOINTMENTS_TABLE}

    if 'last_evaluated_key' in event['queryStringParameters']:
        kwargs['ExclusiveStartKey'] = json.loads(event['queryStringParameters']['last_evaluated_key'])

    if 'from' in event['queryStringParameters']:
        kwargs['ExpressionAttributeValues'] = {':f': {'S': event['queryStringParameters']['from']}}
        kwargs['ExpressionAttributeNames'] = {'#F': 'from'}
        kwargs['KeyConditionExpression'] = '#F = :f'
        results = dynamodb.query(**kwargs)
    elif 'month' in event['queryStringParameters'] and 'before' in event['queryStringParameters'] and 'after' in event['queryStringParameters']:
        kwargs['ExpressionAttributeValues'] = {
            ':month': {'S': event['queryStringParameters']['month']},
            ':before': {'S': event['queryStringParameters']['before']},
            ':after': {'S': event['queryStringParameters']['after']},
        }
        kwargs['ExpressionAttributeNames'] = {'#M': 'month', '#D': 'datetime'}
        kwargs['KeyConditionExpression'] = '#M = :month AND #D BETWEEN :after AND :before'
        kwargs['IndexName'] = 'month-datetime-index'
        results = dynamodb.query(**kwargs)
    else:
        results = dynamodb.scan(**kwargs)
    
    return {"statusCode": 200, "body": json.dumps(results)}
