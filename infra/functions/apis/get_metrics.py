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

import boto3
import logging

logger = logging.getLogger('get_metric')
logger.setLevel(logging.INFO)

client = boto3.client('personalize')


def handler(event, context):
    name = event.get('name', '')
    if not name:
        raise RuntimeError('campaign name should be provided')

    campaigns = client.list_campaigns(maxResults=100)['campaigns']
    campaign_arns = [campaign['campaignArn'] for campaign in campaigns if campaign['name'] == name]
    if not campaign_arns:
        raise RuntimeError(f'There is no campaign for name: {name}')

    campaign = client.describe_campaign(campaignArn=campaign_arns[0])['campaign']

    response = client.get_solution_metrics(
        solutionVersionArn=campaign['solutionVersionArn'],
    )
    return response['metrics']