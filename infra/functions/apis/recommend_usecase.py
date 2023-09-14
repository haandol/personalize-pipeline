import os
import boto3
import logging

logger = logging.getLogger("recommend")
logger.setLevel(logging.INFO)

client = boto3.client("personalize-runtime")


def handler(event, context):
    logger.debug(event)

    recommender_arn = event.get("recommender_arn", "") or os.environ.get(
        "RECOMMENDER_ARN", ""
    )
    if not recommender_arn:
        raise RuntimeError("recommender_arn should be provided")

    user_id = event.get("user_id", None)
    if not user_id:
        raise RuntimeError("user_id should be provided")
    item_id = event.get("item_id", None)
    num_results = int(event.get("num_results", "") or 25)

    params = dict(
        recommenderArn=recommender_arn,
        userId=user_id,
        numResults=num_results,
    )
    if item_id:
        params.update(dict(itemId=item_id))

    return client.get_recommendations(**params)
