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

logger = logging.getLogger('create_campaign')
logger.setLevel(logging.INFO)
personalize = boto3.client(service_name='personalize')


def handler(event, context):
    logger.info(event)

    name = event['name']
    suffix = event['suffix']
    campaign_name = f'{name}-{suffix}'
    solution_version_arn = event['solution_version_arn']

    deploy = bool(event.get('deploy', False))
    campaign_arn = ''
    if deploy:
        params = dict(
            name=campaign_name,
            solutionVersionArn=solution_version_arn,
            minProvisionedTPS=1,    
        )
        campaign_config = event.get('campaign_config', {})
        if campaign_config:
            params['campaignConfig'] = campaign_config

        create_campaign_response = personalize.create_campaign(**params)
        campaign_arn = create_campaign_response['campaignArn']
        logger.info(json.dumps(create_campaign_response, indent=2))

    event.update({
        'stage': 'CAMPAIGN',
        'campaign_arn': campaign_arn,
        'campaign_name': campaign_name,
    })
    return event