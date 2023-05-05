import json
import http.client
import boto3
from datetime import datetime, timezone
import os
import uuid
from common import auth
from common import cors
from common import errors

print('Loading function')

PHONE_NUMBER_ID = os.environ['WA_PHONE_NUMBER_ID']
ACCESS_TOKEN = SECRET = os.environ['WA_ACCESS_TOKEN']
DEFAULT_MESSAGE_TEMPLATE_NAME = 'generic_meeting_reminder'
MESSAGE_TEMPLATE_NAME_MAP = {
    'control': 'meeting_reminder',
    'first_visit': 'generic_meeting_reminder',
    'iris': 'generic_meeting_reminder',
    'bioimpedance': 'generic_meeting_reminder',
    'integration': 'generic_meeting_reminder',
    'bach': 'generic_meeting_reminder',
}
MESSAGE_LANGUAGE_CODE = "it"

MESSAGES_TABLE = "filoDirettoMessages"
APPOINTMENTS_TABLE = "filoDirettoAppointments"


@cors.access_control(methods={'POST'})
@errors.notify_discord
@auth.require_auth
def lambda_handler(event, context):
    print("Received event: " + json.dumps(event, indent=2))
    if event['httpMethod'] != 'POST':
        return {"statusCode": 405, "body": "Method not allowed"}

    body = json.loads(event['body'])

    message_template_name = DEFAULT_MESSAGE_TEMPLATE_NAME
    if body['appointment']['type'] in MESSAGE_TEMPLATE_NAME_MAP:
        message_template_name = MESSAGE_TEMPLATE_NAME_MAP[body['appointment']['type']]

    params = json.dumps({
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": body['message']['to'],
        "type": "template",
        "template": {
            "name": message_template_name,
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
        return {"statusCode": 400, "body": data.decode("utf-8")}
    
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

    dynamodb.put_item(
        TableName=MESSAGES_TABLE,
        Item={
            # A bit confusing, but this is the primary key
            'from': {'S': body['message']['to']},
            'timestamp': {'S': str(int(datetime.now(timezone.utc).timestamp()))},
            'id': {'S': str(uuid.uuid4())},
            # Use the same format as Whatsapp messages for convenience
            'text': {'S': json.dumps({'body': '<TEMPLATE: ' + message_template_name + ', date: ' + body['message']['date'] + ', time: ' + body['message']['time'] + '>'})},
            # Used to disambiguate messages send by the system
            'source': {'S': 'filodiretto'},
        },
    )

    return {"statusCode": 200, "body": json.dumps(result)}
