import os
import json
import boto3
import logging
import traceback
import urllib.parse
import urllib.request
from botocore.exceptions import ClientError

logger = logging.getLogger("notify")
logger.setLevel(logging.INFO)

ses = boto3.client("ses", region_name="ap-northeast-2")

STATUS = os.environ["STATUS"]
SENDER = os.environ.get("SENDER", "")
TO_ADDR = os.environ.get("TO_ADDR", "")
SLACK_WEBHOOK_URL = os.environ.get("SLACK_WEBHOOK_URL", "")
CHIME_WEBHOOK_URL = os.environ.get("CHIME_WEBHOOK_URL", "")


def send_email(event):
    SUBJECT = "AWS Personalize Notification"
    CHARSET = "UTF-8"

    BODY_HTML = """<html>
    <head></head>
    <body>
    <h1>Status: {}</h1>
    <p>{}</p>
    </body>
    </html>
    """

    BODY_TEXT = "Status: {}\r\n" "{}"
    try:
        response = ses.send_email(
            Destination={
                "ToAddresses": [TO_ADDR],
            },
            Message={
                "Body": {
                    "Html": {
                        "Charset": CHARSET,
                        "Data": BODY_HTML.format(STATUS, json.dumps(event)),
                    },
                    "Text": {
                        "Charset": CHARSET,
                        "Data": BODY_TEXT.format(STATUS, json.dumps(event)),
                    },
                },
                "Subject": {
                    "Charset": CHARSET,
                    "Data": SUBJECT,
                },
            },
            Source=SENDER,
        )
    except ClientError as e:
        logger.error(e.response["Error"]["Message"])

    return response


def send_slack_msg(event):
    try:
        msg = event["Records"][0]["Sns"]["Message"]
        data = json.dumps(
            {
                "blocks": [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": f"Deploy: *{STATUS}*\n ```{msg}```",
                        },
                    },
                ],
            }
        ).encode("utf-8")
        headers = {"Content-type": "application/json"}
        req = urllib.request.Request(SLACK_WEBHOOK_URL, data=data, headers=headers)
        resp = urllib.request.urlopen(req, timeout=3)
    except:
        logger.error(traceback.format_exc())


def send_chime_msg(event):
    try:
        msg = event["Records"][0]["Sns"]["Message"]
        data = json.dumps(
            {
                "Content": f"Deploy: *{STATUS}*\n ```{msg}```",
            }
        ).encode("utf-8")
        req = urllib.request.Request(CHIME_WEBHOOK_URL, data=data)
        resp = urllib.request.urlopen(req, timeout=3)
    except:
        logger.error(traceback.format_exc())


def handler(event, context):
    logger.info(event)
    if SENDER and TO_ADDR:
        send_email(event)
    if SLACK_WEBHOOK_URL:
        send_slack_msg(event)
    if CHIME_WEBHOOK_URL:
        send_chime_msg(event)
