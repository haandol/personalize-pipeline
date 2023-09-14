import json
import boto3
import logging
from datetime import datetime

logger = logging.getLogger("dataset")
logger.setLevel(logging.INFO)

personalize = boto3.client(service_name="personalize")


def handler(event, context):
    logger.info(event)

    name = event["name"]
    bucket = event["bucket"]
    schema_arn = event["schema_arn"]
    dataset_group_arn = event["dataset_group_arn"]
    suffix = datetime.now().strftime("%Y%m%dT%H%M%S")

    dataset_type = "INTERACTIONS"
    create_dataset_response = personalize.create_dataset(
        datasetType=dataset_type,
        datasetGroupArn=dataset_group_arn,
        schemaArn=schema_arn,
        name=name,
    )
    dataset_arn = create_dataset_response["datasetArn"]
    logger.info(json.dumps(create_dataset_response, indent=2))

    attach_policy(bucket)

    event.update(
        {
            "stage": "DATASET",
            "suffix": suffix,
            "dataset_arn": dataset_arn,
        }
    )
    return event


def attach_policy(bucket):
    bucket_name = bucket.replace("s3://", "").split("/", 1)[0]
    s3 = boto3.client("s3")
    policy = {
        "Version": "2012-10-17",
        "Id": "PersonalizeS3BucketAccessPolicy",
        "Statement": [
            {
                "Sid": "PersonalizeS3BucketAccessPolicy",
                "Effect": "Allow",
                "Principal": {"Service": "personalize.amazonaws.com"},
                "Action": ["s3:GetObject", "s3:ListBucket"],
                "Resource": [
                    "arn:aws:s3:::{}".format(bucket_name),
                    "arn:aws:s3:::{}/*".format(bucket_name),
                ],
            }
        ],
    }
    s3.put_bucket_policy(Bucket=bucket_name, Policy=json.dumps(policy))
