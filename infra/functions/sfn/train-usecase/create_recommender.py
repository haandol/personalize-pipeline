import json
import boto3
import logging
from datetime import datetime

logger = logging.getLogger("create_recommender")
logger.setLevel(logging.INFO)

personalize = boto3.client(service_name="personalize")


def handler(event, context):
    logger.info(event)

    name = event["name"]
    suffix = datetime.now().strftime("%Y%m%dT%H%M%S")

    recipe_arn = event["recipe_arn"]
    if not recipe_arn.startswith("arn:aws:personalize:::recipe/"):
        raise Exception(f"Invalid recipe arn: {recipe_arn}")

    dataset_group_arn = ""
    dataset_groups_response = personalize.list_dataset_groups(maxResults=100)
    for dataset_group in dataset_groups_response["datasetGroups"]:
        if dataset_group.get("domain", None) and dataset_group["name"] == name:
            dataset_group_arn = dataset_group["datasetGroupArn"]
            break

    if not dataset_group_arn:
        raise RuntimeError(f"There is no datasetgroup for {name}")

    recommender_params = dict(
        name=f"{name}-{suffix}",
        datasetGroupArn=dataset_group_arn,
        recipeArn=recipe_arn,
    )
    if event.get("recommender_config", {}):
        recommender_params["recommenderConfig"] = event["recommender_config"]

    create_recommender_response = personalize.create_recommender(**recommender_params)
    recommender_arn = create_recommender_response["recommenderArn"]
    logger.info(json.dumps(create_recommender_response, indent=2))

    event.update(
        {
            "stage": "RECOMMENDER",
            "suffix": suffix,
            "dataset_group_arn": dataset_group_arn,
            "recommender_arn": recommender_arn,
        }
    )
    return event
