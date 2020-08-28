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
import boto3
import logging

logger = logging.getLogger('recommend')
logger.setLevel(logging.INFO)

client = boto3.client('personalize-runtime')


def handler(event, context):
    logger.debug(event)

    campaign_arn = event.get('campaign_arn', '') or os.environ.get('campaign_arn', '')
    if not campaign_arn:
        raise RuntimeError('campaign_arn should be provided')

    item_id = event.get('item_id', '')
    if not item_id:
        raise RuntimeError('item_id should be provided')

    num_results = int(event.get('num_results', '') or 25)

    return client.get_recommendations(
        campaignArn=campaign_arn,
        itemId=item_id,
        numResults=num_results,
    )