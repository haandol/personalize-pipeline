import json
import boto3
import logging

logger = logging.getLogger("create_recommender")
logger.setLevel(logging.INFO)

personalize = boto3.client(service_name="personalize")


def handler(event, context):
    logger.info(event)

    name = event["name"]
    dataset_group_arn = event["dataset_group_arn"]
    recipe_arn = event["recepe_arn"]

    recommender_params = dict(
        name=name,
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
            "recipe_arn": recipe_arn,
            "dataset_group_arn": dataset_group_arn,
            "recommender_arn": recommender_arn,
        }
    )
    return event
