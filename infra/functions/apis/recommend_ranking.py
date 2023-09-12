import os
import boto3
import logging

logger = logging.getLogger("recommend")
logger.setLevel(logging.INFO)

client = boto3.client("personalize-runtime")


def handler(event, context):
    logger.info(event)

    campaign_arn = event.get("campaign_arn", "") or os.environ.get("campaign_arn", "")
    if not campaign_arn:
        raise RuntimeError("campaign_arn should be provided")

    item_list = [item_id.strip() for item_id in event.get("item_list", "").split(",")]
    if not item_list:
        raise RuntimeError("item_list should be provided")

    user_id = event.get("user_id", "")
    if not user_id:
        raise RuntimeError("user_id should be provided")

    response = client.get_personalized_ranking(
        campaignArn=campaign_arn,
        inputList=item_list,
        userId=user_id,
    )
    return response["personalizedRanking"]
