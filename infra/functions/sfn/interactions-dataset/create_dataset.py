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
    schema_arn = event["schema_arn"]
    recipe_arn = event["recipe_arn"]
    if not recipe_arn.startswith("arn:aws:personalize:::recipe/"):
        raise Exception(f"Invalid recipe arn: {recipe_arn}")

    suffix = datetime.now().strftime("%Y%m%dT%H%M%S")
    bucket = event["bucket"]
    if not bucket.startswith("s3://") and not bucket.endswith(".csv"):
        raise Exception(f"Invalid bucket format, s3://bucket_name/xyz.csv but {bucket}")

    dataset_group_arn = ""
    dataset_groups_response = personalize.list_dataset_groups(maxResults=100)
    for dataset_group in dataset_groups_response["datasetGroups"]:
        if dataset_group["name"] == name:
            dataset_group_arn = dataset_group["datasetGroupArn"]
            break

    if not dataset_group_arn:
        raise RuntimeError(f"There is no datasetgroup for {name}")

    dataset_arn, is_created = get_or_create_dataset(dataset_group_arn, schema_arn, name)
    if is_created:
        attach_policy(bucket)

    event.update(
        {
            "stage": "DATASET",
            "status": "Invalid",
            "name": name,
            "schema_arn": schema_arn,
            "recipe_arn": recipe_arn,
            "suffix": suffix,
            "dataset_group_arn": dataset_group_arn,
            "dataset_arn": dataset_arn,
        }
    )
    return event


def get_or_create_dataset(dataset_group_arn, schema_arn, name):
    is_created = False

    list_datasets_resp = personalize.list_datasets(datasetGroupArn=dataset_group_arn)
    for dataset in list_datasets_resp["datasets"]:
        if dataset["datasetType"].upper() == "INTERACTIONS":
            return dataset["datasetArn"], is_created

    create_dataset_response = personalize.create_dataset(
        datasetType="INTERACTIONS",
        datasetGroupArn=dataset_group_arn,
        schemaArn=schema_arn,
        name=name,
    )
    dataset_arn = create_dataset_response["datasetArn"]
    is_created = True
    logger.info(json.dumps(create_dataset_response, indent=2))
    return dataset_arn, is_created


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
