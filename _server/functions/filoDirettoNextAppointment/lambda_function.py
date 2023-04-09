import json
import boto3
import datetime
from common import auth
from common import cors

print('Loading function')

APPOINTMENTS_TABLE = "filoDirettoAppointments"


@cors.access_control(methods={'GET'})
@auth.require_auth
def lambda_handler(event, context):
    print("Received event: " + json.dumps(event, indent=2))
    if event['httpMethod'] != 'GET':
        return {"statusCode": 400, "body": "HTTP method not supported"}
    
    if 'from' not in event['queryStringParameters']:
        return {"statusCode": 400, "body": "Missing from param"}

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
    
    return {"statusCode": 200, "body": json.dumps(results)}
