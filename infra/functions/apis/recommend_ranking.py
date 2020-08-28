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
    logger.info(event)

    campaign_arn = event.get('campaign_arn', '') or os.environ.get('campaign_arn', '')
    if not campaign_arn:
        raise RuntimeError('campaign_arn should be provided')

    item_list = [item_id.strip()
                 for item_id in event.get('item_list', '').split(',')]
    if not item_list:
        raise RuntimeError('item_list should be provided')

    user_id = event.get('user_id', '')
    if not user_id:
        raise RuntimeError('user_id should be provided')

    response = client.get_personalized_ranking(
        campaignArn=campaign_arn,
        inputList=item_list,
        userId=user_id,
    )
    return response['personalizedRanking']