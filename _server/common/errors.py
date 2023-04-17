import traceback
import os
from common import discord


def _send_error_message(event):
    WEBHOOK_ID = os.environ.get('DISCORD_WEBHOOK_ID')
    WEBHOOK_TOKEN = os.environ.get('DISCORD_WEBHOOK_TOKEN')
    if WEBHOOK_ID is None or WEBHOOK_TOKEN is None:
        print("WEBHOOK_ID/WEBHOOK_TOKEN NOT SET")
        return

    discord.send_message(
        WEBHOOK_ID,
        WEBHOOK_TOKEN,
        event['httpMethod'] + " " + event['path'] + "\n\n" + traceback.format_exc(),
    )


def notify_discord(f):
    def new_f(event, context):
        try:
            return f(event, context)
        except Exception:
            _send_error_message(event)

        return {"statusCode": 500, "body": "Server error"}
    return new_f
