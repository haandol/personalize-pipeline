import json
import boto3
import logging

logger = logging.getLogger("create_campaign")
logger.setLevel(logging.INFO)
personalize = boto3.client(service_name="personalize")


def handler(event, context):
    logger.info(event)

    name = event["name"]
    suffix = event["suffix"]
    campaign_name = f"{name}-{suffix}"
    solution_version_arn = event["solution_version_arn"]

    deploy = bool(event.get("deploy", False))
    campaign_arn = ""
    if deploy:
        params = dict(
            name=campaign_name,
            solutionVersionArn=solution_version_arn,
            minProvisionedTPS=1,
        )
        campaign_config = event.get("campaign_config", {})
        if campaign_config:
            params["campaignConfig"] = campaign_config

        create_campaign_response = personalize.create_campaign(**params)
        campaign_arn = create_campaign_response["campaignArn"]
        logger.info(json.dumps(create_campaign_response, indent=2))

    event.update(
        {
            "stage": "CAMPAIGN",
            "campaign_arn": campaign_arn,
            "campaign_name": campaign_name,
        }
    )
    return event
