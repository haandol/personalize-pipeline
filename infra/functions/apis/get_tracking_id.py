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

import time
import json
import boto3
import logging

logger = logging.getLogger('get_event_handler')
logger.setLevel(logging.INFO)

personalize = boto3.client('personalize')


def handler(event, context):
    logger.info(event)

    name = event['name']
    dataset_groups = list(filter(
        lambda x: x['name'] == name,
        personalize.list_dataset_groups()['datasetGroups']
    ))
    if not dataset_groups:
        raise RuntimeError(f'There are no DatasetGroup for given name: {name}')
        
    dataset_group_arn = dataset_groups[0]['datasetGroupArn']

    event_trackers = personalize.list_event_trackers(datasetGroupArn=dataset_group_arn)['eventTrackers']
    if not event_trackers:
        raise RuntimeError(f'There are no EventTracker for given DatasetGroupArn: {dataset_group_arn}')

    event_tracker_arn = event_trackers[0]['eventTrackerArn']
    logger.info(f'EventTrackerArn: {event_tracker_arn}')

    event_tracker = personalize.describe_event_tracker(eventTrackerArn=event_tracker_arn)['eventTracker']
    return {
        'name': event_tracker['name'],
        'trackingId': event_tracker['trackingId']
    }