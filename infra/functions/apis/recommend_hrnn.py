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

    user_id = event.get('user_id', '')
    if not user_id:
        raise RuntimeError('user_id should be provided')

    num_results = int(event.get('num_results', '') or 25)

    return client.get_recommendations(
        campaignArn=campaign_arn,
        userId=user_id,
        numResults=num_results,
    )