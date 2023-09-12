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

    solution_version_list = []
    for solution_arn in solution_arn_list:
        response = client.list_solution_versions(
            solutionArn=solution_arn, maxResults=100
        )

        for solution_version in response["solutionVersions"]:
            solution_version_list.append(
                {
                    "status": solution_version["status"],
                    "solution_version_arn": solution_version["solutionVersionArn"],
                }
            )

    return solution_version_list
