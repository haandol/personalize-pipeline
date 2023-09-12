import os
import json
import boto3
import logging
from datetime import datetime

logger = logging.getLogger("recommend-batch-segment")
logger.setLevel(logging.INFO)

s3 = boto3.client("s3")
client = boto3.client("personalize")

ROLE_ARN = os.environ["ROLE_ARN"]


def handler(event, context):
    logger.debug(event)

    suffix = datetime.now().strftime("%Y%m%dT%H%M%S")
    name = event["name"]
    solution_version_arn = event["solution_version_arn"]
    num_results = int(event.get("num_results", "") or 25)
    input_path = event["input_path"]
    if not input_path.startswith("s3://") and not input_path.endswith(".json"):
        raise Exception(
            f"Invalid bucket format, s3://BUCKET_NAME/XYZ.json but {input_path}"
        )

    output_path = event["output_path"]
    if not output_path.startswith("s3://") and not output_path.endswith("/"):
        raise Exception(f"Invalid bucket format, s3://BUCKET_NAME/ but {output_path}")

    attach_policy(input_path)
    attach_policy(output_path)

    params = dict(
        jobName=f"{name}-{suffix}",
        solutionVersionArn=solution_version_arn,
        numResults=num_results,
        jobInput={
            "s3DataSource": {
                "path": input_path,
            }
        },
        jobOutput={
            "s3DataDestination": {
                "path": output_path,
            }
        },
        roleArn=ROLE_ARN,
    )
    batch_segment_job_resp = client.create_batch_segment_job(**params)
    return {
        "batch_segment_job_arn": batch_segment_job_resp["batchSegmentJobArn"],
    }


def attach_policy(bucket):
    bucket_name = bucket.replace("s3://", "").split("/", 1)[0]
    policy = {
        "Version": "2012-10-17",
        "Id": "PersonalizeS3BucketAccessPolicy",
        "Statement": [
            {
                "Sid": "PersonalizeS3BucketAccessPolicy",
                "Effect": "Allow",
                "Principal": {"Service": "personalize.amazonaws.com"},
                "Action": ["s3:*Object", "s3:ListBucket"],
                "Resource": [
                    "arn:aws:s3:::{}".format(bucket_name),
                    "arn:aws:s3:::{}/*".format(bucket_name),
                ],
            }
        ],
    }
    s3.put_bucket_policy(Bucket=bucket_name, Policy=json.dumps(policy))
