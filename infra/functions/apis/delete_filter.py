import boto3
import logging

logger = logging.getLogger("delete-filter")
logger.setLevel(logging.INFO)

personalize = boto3.client(service_name="personalize")


def handler(event, context):
    logger.info(event)

    filter_arn = event["filter_arn"]

    personalize.delete_filter(filterArn=filter_arn)

    return {"filter_arn": filter_arn}
