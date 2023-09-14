import os
import boto3
import logging

logger = logging.getLogger("recommend")
logger.setLevel(logging.INFO)

client = boto3.client("personalize-runtime")


def handler(event, context):
    logger.debug(event)

    campaign_arn = event.get("campaign_arn", None) or os.environ.get(
        "CAMPAIGN_ARN", None
    )
    if not campaign_arn:
        raise RuntimeError("campaign_arn should be provided")

    item_id = event.get("item_id", None)
    if not item_id:
        raise RuntimeError("item_id should be provided")

    num_results = int(event.get("num_results", "25"))

    return client.get_recommendations(
        campaignArn=campaign_arn,
        itemId=item_id,
        numResults=num_results,
    )
