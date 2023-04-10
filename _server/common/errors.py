import json
import http.client
import traceback
import os


def _send_error_message():
    WEBHOOK_ID = os.environ.get('DISCORD_WEBHOOK_ID')
    WEBHOOK_TOKEN = os.environ.get('DISCORD_WEBHOOK_TOKEN')
    if WEBHOOK_ID is None or WEBHOOK_TOKEN is None:
        print("WEBHOOK_ID/WEBHOOK_TOKEN NOT SET")
        return

    params = json.dumps({"content": traceback.format_exc()})
    headers = {"Content-type": "application/json"}
    conn = http.client.HTTPSConnection("discord.com")
    conn.request("POST", "/api/webhooks/" + WEBHOOK_ID + "/" + WEBHOOK_TOKEN, params, headers)
    response = conn.getresponse()
    print(response.status, response.reason)
    data = response.read()
    print("Response body:")
    print(data)
    conn.close()


def notify_discord(f):
    def new_f(event, context):
        try:
            return f(event, context)
        except Exception:
            _send_error_message()

        return {"statusCode": 500, "body": "Server error"}
    return new_f
