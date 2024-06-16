import json


def log_event(f):
    def new_f(event, context):
        print("Received event: " + json.dumps(event, indent=2))
        return f(event, context)
    return new_f
