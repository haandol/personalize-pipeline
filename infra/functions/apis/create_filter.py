import json
import boto3
import logging

logger = logging.getLogger("create-filter")
logger.setLevel(logging.INFO)

personalize = boto3.client(service_name="personalize")


def handler(event, context):
    logger.info(event)

    name = event["name"]
    dataset_group_name = event["dataset_group_name"]
    filter_expression = event["filter_expression"]

    dataset_group_arn = ""
    dataset_groups_response = personalize.list_dataset_groups(maxResults=100)
    for dataset_group in dataset_groups_response["datasetGroups"]:
        if dataset_group["name"] == dataset_group_name:
            dataset_group_arn = dataset_group["datasetGroupArn"]
            break
    if not dataset_group_arn:
        raise RuntimeError(f"There is no dataset group for name: {name}")

    create_filter_response = personalize.create_filter(
        name=name,
        datasetGroupArn=dataset_group_arn,
        filterExpression=filter_expression,
    )
    logger.info(json.dumps(create_filter_response, indent=2))
    filter_arn = create_filter_response["filterArn"]

    return {
        "name": name,
        "dataset_group_arn": dataset_group_arn,
        "filter_arn": filter_arn,
    }
