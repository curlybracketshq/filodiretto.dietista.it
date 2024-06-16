import json
import os
from common import errors
from common import discord
from common import db
from common import logging

print('Loading function')

VERIFY_TOKEN = os.environ['WA_VERIFY_TOKEN']
DISCORD_MESSAGES_WEBHOOK_ID = os.environ.get('DISCORD_MESSAGES_WEBHOOK_ID')
DISCORD_MESSAGES_WEBHOOK_TOKEN = os.environ.get('DISCORD_MESSAGES_WEBHOOK_TOKEN')


def _sender_url(sender):
    return "https://filodiretto.dietista.it/conversations/#" + sender


# https://developers.facebook.com/docs/whatsapp/cloud-api/guides/set-up-whatsapp-echo-bot
@errors.notify_discord
@logging.log_event
def lambda_handler(event, context):
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
            
        results = db.query_messages(first_message['from'], limit=1)

        if not results.get('Items', []):
            db.put_sender_conditionally(
                first_message['from'],
                first_message['timestamp'],
                first_message['id'],
            )

        db.put_message_from_whatsapp(
            first_message['from'],
            first_message['timestamp'],
            first_message['id'],
            first_message['text'],
        )

        print('Send Discord notification')
        discord.send_message(
            DISCORD_MESSAGES_WEBHOOK_ID,
            DISCORD_MESSAGES_WEBHOOK_TOKEN,
            "From: " + _sender_url(first_message['from']) + "\n" + first_message['text']['body'],
        )

        return {"statusCode": 200, "body": "Ok"}

    return {"statusCode": 405, "body": "Method not allowed"}
