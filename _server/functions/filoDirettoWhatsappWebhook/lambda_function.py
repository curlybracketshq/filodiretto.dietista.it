import json
import http.client
import boto3
import os
from common import errors

print('Loading function')

VERIFY_TOKEN = os.environ['WA_VERIFY_TOKEN']
MESSAGES_TABLE = "filoDirettoMessages"
SENDERS_TABLE = "filoDirettoSenders"
DISCORD_MESSAGES_WEBHOOK_ID = os.environ.get('DISCORD_MESSAGES_WEBHOOK_ID')
DISCORD_MESSAGES_WEBHOOK_TOKEN = os.environ.get('DISCORD_MESSAGES_WEBHOOK_TOKEN')


def _sender_url(sender):
    return "https://filodiretto.dietista.it/conversations/#" + sender


def _send_discord_message(sender, message):
    params = json.dumps({"content": "From: " + _sender_url(sender) + "\n" + message})
    headers = {"Content-type": "application/json"}
    conn = http.client.HTTPSConnection("discord.com")
    conn.request("POST", "/api/webhooks/" + DISCORD_MESSAGES_WEBHOOK_ID + "/" + DISCORD_MESSAGES_WEBHOOK_TOKEN, params, headers)
    response = conn.getresponse()
    print(response.status, response.reason)
    data = response.read()
    print("Response body:")
    print(data)
    conn.close()


# https://developers.facebook.com/docs/whatsapp/cloud-api/guides/set-up-whatsapp-echo-bot
@errors.notify_discord
def lambda_handler(event, context):
    print("Received event: " + json.dumps(event, indent=2))
    # https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
    # to learn more about GET request for webhook verification
    if event['httpMethod'] == 'GET':
        if event.get('queryStringParameters', {}).get('hub.mode') == 'subscribe' and event.get('queryStringParameters', {}).get('hub.verify_token') == VERIFY_TOKEN:
            return {"statusCode": 200, "body": event.get('queryStringParameters', {}).get('hub.challenge')}
        else:
            return {"statusCode": 400, "body": "Subscription failed"}
    # process POST request (WhatsApp chat messages)
    # https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples#text-messages
    # to learn about WhatsApp text message payload structure
    elif event['httpMethod'] == 'POST':
        body = json.loads(event['body'])
        if body['entry'][0]['changes'][0]['field'] != 'messages':
            return {"statusCode": 400, "body": "Field not supported"}

        value = body['entry'][0]['changes'][0]['value']
        print("Value: " + json.dumps(value, indent=2))
        if 'messages' not in value:
            return {"statusCode": 400, "body": "Value not supported"}

        first_message = value['messages'][0]
        # Only reply to texts (no reactions)
        if first_message['type'] != 'text':
            return {"statusCode": 400, "body": "Message type not supported"}
            
        dynamodb = boto3.client('dynamodb')
        dynamodb_resource = boto3.resource('dynamodb')
        results = dynamodb.query(
            TableName=MESSAGES_TABLE,
            ExpressionAttributeValues={':v1': {'S': first_message['from']}},
            ExpressionAttributeNames={'#from_field': 'from'},
            KeyConditionExpression='#from_field = :v1',
            ScanIndexForward=False,
            Limit=1,
        )

        if not results.get('Items', []):
            # Add a new sender conditionally so we don't overwrite existing items
            try:
                dynamodb.put_item(
                    TableName=SENDERS_TABLE,
                    Item={
                        'from': {'S': first_message['from']},
                        'timestamp':{'S': first_message['timestamp']},
                        'id': {'S': first_message['id']},
                    },
                    ExpressionAttributeNames={
                        '#F': 'from',
                    },
                    ConditionExpression='attribute_not_exists(#F)',
                )
            except dynamodb_resource.meta.client.exceptions.ConditionalCheckFailedException as e:
                print('CONTACT ALREADY SAVED')
                print(e)

        dynamodb.put_item(
            TableName=MESSAGES_TABLE,
            Item={
                'from': {'S': first_message['from']},
                'timestamp': {'S': first_message['timestamp']},
                'id': {'S': first_message['id']},
                'text': {'S': json.dumps(first_message['text'])},
            },
        )

        print('Send Discord notification')
        _send_discord_message(first_message['from'], first_message['text']['body'])

        return {"statusCode": 200, "body": "Ok"}

    return {"statusCode": 405, "body": "Method not allowed"}
