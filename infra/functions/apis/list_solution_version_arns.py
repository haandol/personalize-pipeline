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

client = boto3.client('personalize')


def handler(event, context):
    logger.info(event)
    dataset_groups_response = client.list_dataset_groups(maxResults=100)

    group_arn_list = []
    for response in dataset_groups_response['datasetGroups']:
        group_arn_list.append(response['datasetGroupArn'])
        
    solution_arn_list = []
    for group_arn in group_arn_list:
        solution_response = client.list_solutions(
            datasetGroupArn=group_arn,
            maxResults=100
        )

        for solution in solution_response['solutions']:
            solution_arn_list.append(solution['solutionArn'])

    solution_version_list = []
    for solution_arn in solution_arn_list:
        response = client.list_solution_versions(
            solutionArn=solution_arn,
            maxResults=100
        )   
            
        for solution_version in response['solutionVersions']:
            solution_version_list.append({
                'status': solution_version['status'],
                'solution_version_arn': solution_version['solutionVersionArn'],
            })
    
    return solution_version_list