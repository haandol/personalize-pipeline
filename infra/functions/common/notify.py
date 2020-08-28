###############################################################################
# Copyright 2019 Amazon.com, Inc. and its affiliates. All Rights Reserved.    #
#                                                                             #
# Licensed under the Amazon Software License (the "License").                 #
#  You may not use this file except in compliance with the License.           #
# A copy of the License is located at                                         #
#                                                                             #
#  http://aws.amazon.com/asl/                                                 #
#                                                                             #
#  or in the "license" file accompanying this file. This file is distributed  #
#  on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either  #
#  express or implied. See the License for the specific language governing    #
#  permissions and limitations under the License.                             #
###############################################################################

import os
import json
import boto3
import logging
import traceback
import urllib.parse
import urllib.request
from botocore.exceptions import ClientError

logger = logging.getLogger('notify')
logger.setLevel(logging.INFO)

ses = boto3.client('ses', region_name='ap-northeast-2')

STATUS = os.environ['STATUS']
SENDER = os.environ.get('SENDER', '')
TO_ADDR = os.environ.get('TO_ADDR', '')
SLACK_WEBHOOK_URL = os.environ.get('SLACK_WEBHOOK_URL', '')


def send_email(event):
    SUBJECT = "AWS Personalize Notification"
    CHARSET = 'UTF-8'

    BODY_HTML = '''<html>
    <head></head>
    <body>
    <h1>Status: {}</h1>
    <p>{}</p>
    </body>
    </html>
    '''

    BODY_TEXT = (
        "Status: {}\r\n"
        "{}"
    )
    try:
        response = ses.send_email(
            Destination={
                'ToAddresses': [TO_ADDR],
            },
            Message={
                'Body': {
                    'Html': {
                        'Charset': CHARSET,
                        'Data': BODY_HTML.format(STATUS, json.dumps(event)),
                    },
                    'Text': {
                        'Charset': CHARSET,
                        'Data': BODY_TEXT.format(STATUS, json.dumps(event)),
                    },
                },
                'Subject': {
                    'Charset': CHARSET,
                    'Data': SUBJECT,
                },
            },
            Source=SENDER,
        )
    except ClientError as e:
        logger.error(e.response['Error']['Message'])

    return response


def send_slack_msg(event):
    try:
        err_msg = event['Records'][0]['Sns']['Message']
        data = json.dumps({
            'blocks': [
                {
                    'type': 'section',
                    'text': {
                        'type': 'mrkdwn',
                        'text': f'Deploy: *{STATUS}*\n ```{err_msg}```',
                    }
                },
            ],
        }).encode('utf-8')
        headers = { 'Content-type': 'application/json' }
        req = urllib.request.Request(SLACK_WEBHOOK_URL, data=data, headers=headers)
        resp = urllib.request.urlopen(req)
    except:
        logger.error(traceback.format_exc())


def handler(event, context):
    logger.info(event)
    if SENDER and TO_ADDR:
        send_email(event)
    if SLACK_WEBHOOK_URL:
        send_slack_msg(event)