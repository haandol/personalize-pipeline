import boto3
import logging

logger = logging.getLogger("get_event_handler")
logger.setLevel(logging.INFO)

client = boto3.client("personalize")


def handler(event, context):
    logger.info(event)
    dataset_groups_response = client.list_dataset_groups(maxResults=100)

    group_arn_list = []
    for response in dataset_groups_response["datasetGroups"]:
        group_arn_list.append(response["datasetGroupArn"])

    solution_arn_list = []
    for group_arn in group_arn_list:
        solution_response = client.list_solutions(
            datasetGroupArn=group_arn, maxResults=100
        )

        for solution in solution_response["solutions"]:
            solution_arn_list.append(solution["solutionArn"])

    campaign_list = []
    for solution_arn in solution_arn_list:
        response = client.list_campaigns(solutionArn=solution_arn, maxResults=100)

        for campaign in response["campaigns"]:
            campaign_list.append(
                {
                    "name": campaign["name"],
                    "status": campaign["status"],
                    "campaign_arn": campaign["campaignArn"],
                }
            )

    return campaign_list
