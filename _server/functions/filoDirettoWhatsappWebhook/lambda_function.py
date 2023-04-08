import json
import http.client
import boto3
import time
import os

print('Loading function')

PHONE_NUMBER_ID = os.environ['WA_PHONE_NUMBER_ID']
VERIFY_TOKEN = os.environ['WA_VERIFY_TOKEN']
ACCESS_TOKEN = os.environ['WA_ACCESS_TOKEN']
GREETING_TEXT = "Ciao e grazie per avermi contattato\n\nSe vuoi prenotare un appuntamento vai su https://cal.com/dietista\n\nPer qualsiasi altra richiesta scrivi a info@dietista.it\n\nDott.ssa Mara Micolucci"
MESSAGES_TABLE = "filoDirettoMessages"
SENDERS_TABLE = "filoDirettoSenders"
AUTO_REPLY_MESSAGE_THRESHOLD = 86400
CHATGPT_ALLOWLIST = set(json.loads(os.environ['CHATGPT_ALLOWLIST']))
CHATGPT_API_KEY = os.environ['CHATGPT_API_KEY']
CHATGPT_SYSTEM_PROMPT_1 = os.environ['CHATGPT_SYSTEM_PROMPT_1']
CHATGPT_SYSTEM_PROMPT_2 = os.environ['CHATGPT_SYSTEM_PROMPT_2']


# https://developers.facebook.com/docs/whatsapp/cloud-api/guides/set-up-whatsapp-echo-bot
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

        if results.get('Items', []):
            is_first_message = False
            now = int(time.time())
            last_message_timestamp = int(results['Items'][0]['timestamp']['S'])
            delta = now - last_message_timestamp
        else:
            # Send a reply if it's the first time we see this sender
            is_first_message = True
            delta = AUTO_REPLY_MESSAGE_THRESHOLD
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
                'timestamp':{'S': first_message['timestamp']},
                'id': {'S': first_message['id']},
                'text': {'S': json.dumps(first_message['text'])},
            },
        )
        
        print('NUMBER IN CHATGPT_ALLOWLIST', first_message['from'] in CHATGPT_ALLOWLIST)
        print('LAST MESSAGE LESS THAN AUTO_REPLY_MESSAGE_THRESHOLD', delta < AUTO_REPLY_MESSAGE_THRESHOLD)
        
        # Only reply if the last message has been sent more than 24 hours ago
        if first_message['from'] not in CHATGPT_ALLOWLIST and delta < AUTO_REPLY_MESSAGE_THRESHOLD:
            return {"statusCode": 200, "body": "Ok"}
        
        if first_message['from'] in CHATGPT_ALLOWLIST:
            params = json.dumps({
                "model": "gpt-3.5-turbo",
                "messages": [
                    {"role": "system", "content": CHATGPT_SYSTEM_PROMPT_1},
                    {"role": "system", "content": CHATGPT_SYSTEM_PROMPT_2},
                    {"role": "user", "content": first_message['text']['body']},
                ],
            })
            
            headers = {"Content-type": "application/json", "Authorization": "Bearer " + CHATGPT_API_KEY}
            conn = http.client.HTTPSConnection("api.openai.com")
            conn.request("POST", "/v1/chat/completions", params, headers)
            response = conn.getresponse()
            print(response.status, response.reason)
            data = response.read()
            print("Response body:")
            print(data)
            conn.close()
            result = json.loads(data.decode('utf-8'))
            if 'choices' in result and result['choices']:
                message_body = result['choices'][0]['message']['content']
            else:
                message_body = GREETING_TEXT
        else:
            message_body = GREETING_TEXT

        params = json.dumps({
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": first_message['from'],
            "type": "text",
            "text": {
                "preview_url": True,
                "body": message_body,
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
        return {"statusCode": 200, "body": "Ok"}

    return {"statusCode": 400, "body": "HTTP method not supported"}
