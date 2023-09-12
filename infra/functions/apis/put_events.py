import json
import boto3
import logging
from datetime import datetime

logger = logging.getLogger("put_events")
logger.setLevel(logging.INFO)

personalize_events = boto3.client(service_name="personalize-events")


def handler(event, context):
    logger.info(event)

    tracking_id = str(event.pop("tracking_id"))
    user_id = str(event.pop("user_id"))
    session_id = str(event.pop("session_id"))

    # event list
    event_type = str(event.pop("event_type"))
    event_value = float(event.pop("event_value"))
    item_id = str(event.pop("item_id"))
    recommendation_id = str(event.pop("recommendation_id", ""))
    impression = event.pop("impression", [])
    sent_at = float(event.pop("sent_at"))
    properties = {
        convert_to_camel(k): str(v) for k, v in event.pop("properties", {}).items()
    }
    properties.update(
        {
            "eventValue": event_value,
            "itemId": item_id,
        }
    )
    body = {
        "eventType": event_type,
        "properties": json.dumps(properties),
        "sentAt": datetime.fromtimestamp(sent_at),
    }
    if recommendation_id:
        body["recommendationId"] = recommendation_id
    if impression:
        body["impression"] = list(map(str, impression))

    return send_user_events(tracking_id, user_id, session_id, body)


def send_user_events(tracking_id, user_id, session_id, body):
    return personalize_events.put_events(
        trackingId=tracking_id,
        userId=user_id,
        sessionId=session_id,
        eventList=[body],
    )["ResponseMetadata"]


def convert_to_camel(key):
    head, *tails = key.split("_")
    return head + "".join(map(lambda x: x.title(), tails))
