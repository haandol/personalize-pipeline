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

logger = logging.getLogger('check_ready')
logger.setLevel(logging.INFO)

personalize = boto3.client(service_name='personalize')


def handler(event, context):
    event['status'] = 'Invalid'
    logger.info(event)

    stage = event['stage']
    if stage == 'DATASET_GROUP':
        dataset_group_arn = event['dataset_group_arn']
        event['status'] = check_dataset_group(dataset_group_arn)
    elif stage == 'DATASET_IMPORT':
        dataset_import_job_arn = event['dataset_import_job_arn']
        event['status'] = check_dataset_import_job(dataset_import_job_arn)
    elif stage == 'ITEM_DATASET_IMPORT':
        dataset_import_job_arn = event['dataset_import_job_arn']
        event['status'] = check_dataset_import_job(dataset_import_job_arn)
    elif stage == 'USER_DATASET_IMPORT':
        dataset_import_job_arn = event['dataset_import_job_arn']
        event['status'] = check_dataset_import_job(dataset_import_job_arn)
    elif stage == 'SOLUTION':
        solution_version_arn = event['solution_version_arn']
        event['status'] = check_solution_version(solution_version_arn)
    elif stage == 'CAMPAIGN':
        campaign_arn = event['campaign_arn']
        event['status'] = check_campaign(campaign_arn)
    else:
        raise RuntimeError(f'Invalid stage: {stage}')

    return event


def check_dataset_group(dataset_group_arn):
    describe_dataset_group_response = personalize.describe_dataset_group(
        datasetGroupArn=dataset_group_arn
    )
    status = describe_dataset_group_response['datasetGroup']['status']
    logger.info('DatasetGroup: {}'.format(status))
    return status


def check_dataset_import_job(dataset_import_job_arn):
    # skip creating dataset import job
    if not dataset_import_job_arn:
        return 'ACTIVE'

    describe_dataset_import_job_response = personalize.describe_dataset_import_job(
        datasetImportJobArn=dataset_import_job_arn
    )

    dataset_import_job = describe_dataset_import_job_response['datasetImportJob']
    if 'latestDatasetImportJobRun' not in dataset_import_job:
        status = dataset_import_job['status']
        logger.info('DatasetImportJob: {}'.format(status))
    else:
        status = dataset_import_job['latestDatasetImportJobRun']['status']
        logger.info('LatestDatasetImportJobRun: {}'.format(status))
    return status


def check_solution_version(solution_version_arn):
    describe_solution_version_response = personalize.describe_solution_version(
        solutionVersionArn=solution_version_arn
    )
    status = describe_solution_version_response['solutionVersion']['status']
    logger.info('SolutionVersion: {}'.format(status))
    return status


def check_campaign(campaign_arn):
    # skip creating campaign
    if not campaign_arn:
        return 'ACTIVE'

    describe_campaign_response = personalize.describe_campaign(
        campaignArn=campaign_arn
    )
    status = describe_campaign_response['campaign']['status']
    logger.info('Campaign: {}'.format(status))
    return status