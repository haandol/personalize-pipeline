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

import json
import boto3
import logging
import traceback
from base64 import b64decode
from datetime import datetime
from collections import defaultdict

logger = logging.getLogger('put_events')
logger.setLevel(logging.INFO)

personalize_events = boto3.client(service_name='personalize-events')


def send_user_events(tracking_id, session_id, user_id, event_list):
    '''PutEvents 최대 이벤트가 10개라 10개씩 끊어서 보내야한다
    TODO: IO 작업이므로 ThreadPool 로 속도를 올릴 수 있다.
    '''
    n_events = len(event_list)
    logger.info(f'events: {n_events}')
    start = 0
    for end in range(10, n_events+11, 10):
        personalize_events.put_events(
            trackingId=tracking_id,
            sessionId=session_id,
            userId=user_id,
            eventList=event_list[start:end],
        )
        start = end


def handler(event, context):
    logger.info(event)

    n_success = 0

    payloads = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))
    for record in event['Records']:
        update_payloads(
            payloads,
            record['kinesis']['partitionKey'],
            record['kinesis']['data']
        )

    for tracking_id in payloads:
        for session_id in payloads[tracking_id]:
            user_payloads = payloads[tracking_id][session_id]
            logger.debug(user_payloads)
            for user_id in user_payloads:
                user_events = user_payloads[user_id]
                logger.debug(user_events)
                send_user_events(tracking_id, session_id, user_id, user_events)
                n_success += len(user_events)

    return { 'success': n_success }


def update_payloads(payloads, event_id, binary):
    data = json.loads(b64decode(binary).decode('utf-8'))
    tracking_id = str(data.pop('tracking_id'))
    user_id = str(data.pop('user_id'))
    session_id = str(data.pop('session_id'))

    # event list
    event_type = str(data.pop('event_type'))
    event_value = float(data.pop('event_value'))
    item_id = str(data.pop('item_id'))
    recommendation_id = str(data.pop('recommendation_id', ''))
    impression = data.pop('impression', [])
    sent_at = float(data.pop('sent_at'))
    properties = {
        convert_to_camel(k): str(v)
        for k, v in data.pop('properties', {}).items()
    }
    body = {
        'eventId': str(event_id),
        'eventType': str(event_type),
        'itemId': str(item_id),
        'sentAt': datetime.fromtimestamp(sent_at),
    }
    if properties:
        body['properties'] = json.dumps(properties)
    if recommendation_id:
        body['recommendationId'] = recommendation_id
    if impression:
        body['impression'] = list(map(str, impression))

    payloads[tracking_id][session_id][user_id].append(body)


def convert_to_camel(key):
    head, *tails = key.split('_')
    return head + ''.join(map(lambda x: x.title(), tails))