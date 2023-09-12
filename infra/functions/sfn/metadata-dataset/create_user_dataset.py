import json
import boto3
import logging

logger = logging.getLogger("user-dataset")
logger.setLevel(logging.INFO)

personalize = boto3.client(service_name="personalize")


def handler(event, context):
    logger.info(event)

    name = event["name"]
    bucket = event["user_bucket"]
    schema_arn = event["user_schema_arn"]
    dataset_group_arn = event["dataset_group_arn"]

    dataset_arn = ""
    dataset_import_job_arn = ""
    if bucket and schema_arn:
        dataset_arn, is_created = get_or_create_dataset(
            dataset_group_arn, schema_arn, name
        )
        if is_created:
            attach_policy(bucket)

    event.update(
        {
            "stage": "USER_DATASET",
            "dataset_arn": dataset_arn,
            "dataset_import_job_arn": dataset_import_job_arn,
        }
    )
    return event


def get_or_create_dataset(dataset_group_arn, schema_arn, name):
    is_created = False

    list_datasets_resp = personalize.list_datasets(datasetGroupArn=dataset_group_arn)
    for dataset in list_datasets_resp["datasets"]:
        if dataset["datasetType"].upper() == "USERS":
            return dataset["datasetArn"], is_created

    create_dataset_response = personalize.create_dataset(
        datasetType="USERS",
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
