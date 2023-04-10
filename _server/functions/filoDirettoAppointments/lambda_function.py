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
        return {"statusCode": 400, "body": "HTTP method not supported"}

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
