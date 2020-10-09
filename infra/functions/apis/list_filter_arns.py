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

logger = logging.getLogger('list-filter-arns')
logger.setLevel(logging.INFO)

personalize = boto3.client('personalize')


def handler(event, context):
    logger.info(event)

    name = event['name']

    dataset_group_arn = ''
    dataset_groups_response = personalize.list_dataset_groups(maxResults=100)
    for dataset_group in dataset_groups_response['datasetGroups']:
        if dataset_group['name'] == name:
            dataset_group_arn = dataset_group['datasetGroupArn']
            break
    if not dataset_group_arn:
        raise RuntimeError(f'There is no dataset group for name: {name}')

    list_filters_response = personalize.list_filters(
        datasetGroupArn=dataset_group_arn,
        maxResults=100,
    )

    filter_list = []
    for _filter in list_filters_response['Filters']:
        filter_list.append({
            'name': _filter['name'],
            'filter_arn': _filter['filterArn'],
        })
 
    return filter_list