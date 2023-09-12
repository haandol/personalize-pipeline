import json
import boto3
import logging

logger = logging.getLogger("dataset-group")
logger.setLevel(logging.INFO)

personalize = boto3.client(service_name="personalize")


def handler(event, context):
    logger.info(event)

    name = event["name"]
    domain = event.get("domain", None)
    schema_arn = event["schema_arn"]
    bucket = event["bucket"]
    if not bucket.startswith("s3://") and not bucket.endswith(".csv"):
        raise Exception(f"Invalid bucket format, s3://BUCKET_NAME/XYZ.csv but {bucket}")

    item_bucket = event.get("item_bucket", "")
    if (
        item_bucket
        and not item_bucket.startswith("s3://")
        and not item_bucket.endswith(".csv")
    ):
        raise Exception(
            f"Invalid item bucket format, s3://BUCKET_NAME/XYZ.csv but {item_bucket}"
        )
    item_schema_arn = event.get("item_schema_arn", "")

    user_bucket = event.get("user_bucket", "")
    if (
        user_bucket
        and not user_bucket.startswith("s3://")
        and not user_bucket.endswith(".csv")
    ):
        raise Exception(
            f"Invalid item bucket format, s3://BUCKET_NAME/XYZ.csv but {user_bucket}"
        )
    user_schema_arn = event.get("user_schema_arn", "")

    if item_bucket and not item_schema_arn:
        raise Exception(f"item_schema_arn should be provided")

    if user_bucket and not user_schema_arn:
        raise Exception(f"user_schema_arn should be provided")

    # create dataset group
    params = dict(name=name)
    if domain in ["VIDEO_ON_DEMAND", "ECOMMERCE"]:
        params.update(dict(domain=domain))
    create_dataset_group_response = personalize.create_dataset_group(**params)
    logger.info(json.dumps(create_dataset_group_response, indent=2))
    dataset_group_arn = create_dataset_group_response["datasetGroupArn"]

    event.update(
        {
            "stage": "DATASET_GROUP",
            "status": "Invalid",
            "dataset_group_arn": dataset_group_arn,
            "item_bucket": item_bucket,
            "item_schema_arn": item_schema_arn,
            "user_bucket": user_bucket,
            "user_schema_arn": user_schema_arn,
        }
    )
    return event
