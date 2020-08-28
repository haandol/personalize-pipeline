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

logger = logging.getLogger('check_batch_ready')
logger.setLevel(logging.INFO)

personalize = boto3.client(service_name='personalize')


def handler(event, context):
    logger.info(event)

    batch_inference_job_arn = event['batch_inference_job_arn']
    event['status'] = check_batch_inference_job(batch_inference_job_arn)
    return event


def check_batch_inference_job(batch_inference_job_arn):
    describe_batch_inference_job_response = personalize.describe_batch_inference_job(
        batchInferenceJobArn=batch_inference_job_arn
    )
    status = describe_batch_inference_job_response['batchInferenceJob']['status']
    logger.info('BatchInferenceJob: {}'.format(status))
    return status