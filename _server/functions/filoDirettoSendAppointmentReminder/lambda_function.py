import json
import http.client
import boto3
from datetime import datetime
import os
from common import auth

print('Loading function')

PHONE_NUMBER_ID = os.environ['WA_PHONE_NUMBER_ID']
ACCESS_TOKEN = SECRET = os.environ['WA_ACCESS_TOKEN']
MESSAGE_TEMPLATE_NAME = "meeting_reminder"
MESSAGE_LANGUAGE_CODE = "it"
CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'OPTIONS,POST',
    'Access-Control-Allow-Headers': 'Content-Type',
}
APPOINTMENTS_TABLE = "filoDirettoAppointments"


def lambda_handler(event, context):
    print("Received event: " + json.dumps(event, indent=2))
    if event['httpMethod'] == 'OPTIONS':
        return {"statusCode": 200, "body": "Ok", "headers": CORS_HEADERS}
    
    if event['httpMethod'] != 'POST':
        return {"statusCode": 400, "body": "HTTP method not supported", "headers": CORS_HEADERS}

    body = json.loads(event['body'])
    token = json.loads(body['token'])
    if not auth.is_token_valid(token):
        return {"statusCode": 401, "body": "Authentication failed", "headers": CORS_HEADERS}
    
    params = json.dumps({
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": body['message']['to'],
        "type": "template",
        "template": {
            "name": MESSAGE_TEMPLATE_NAME,
            "language": {
                "code": MESSAGE_LANGUAGE_CODE,
            },
            "components": [
                {
                    "type": "body",
                    "parameters": [
                        {
                            "type": "text",
                            "text": body['message']['date'],
                        },
                        {
                            "type": "text",
                            "text": body['message']['time'],
                        },
                    ],
                },
            ],
        },
    })
    headers = {"Content-type": "application/json", "Authorization": "Bearer " + ACCESS_TOKEN}
    conn = http.client.HTTPSConnection("graph.facebook.com")
    conn.request("POST", "/v16.0/" + PHONE_NUMBER_ID + "/messages", params, headers)
    response = conn.getresponse()
    print(response.status, response.reason)
    data = response.read()
    print("Response body:")
    print(data)
    conn.close()

    if response.status != 200:
        return {"statusCode": 400, "body": data.decode("utf-8"), "headers": CORS_HEADERS}
    
    dynamodb = boto3.client('dynamodb')
    result = dynamodb.update_item(
        TableName=APPOINTMENTS_TABLE,
        ExpressionAttributeNames={
            '#F': 'from',
            '#D': 'datetime',
            '#RSA': 'reminderSentAt',
        },
        ExpressionAttributeValues={
            ':f': {'S': body['appointment']['from']},
            ':d': {'S': body['appointment']['datetime']},
            ':rsa': {'S': datetime.now().isoformat(timespec='minutes')},
        },
        Key={
            'from': {'S': body['appointment']['from']},
            'datetime': {'S': body['appointment']['datetime']},
        },
        ReturnValues='ALL_NEW',
        UpdateExpression='SET #RSA = :rsa',
        ConditionExpression='#F = :f AND #D = :d',
    )
    return {"statusCode": 200, "body": json.dumps(result), "headers": CORS_HEADERS}