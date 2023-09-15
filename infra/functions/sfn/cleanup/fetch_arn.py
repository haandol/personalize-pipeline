import boto3
import logging

logger = logging.getLogger("fetch_arn")
logger.setLevel(logging.INFO)

personalize = boto3.client("personalize")


def handler(event, context):
    logger.info(event)

    name = event["name"]

    # Fetch DatasetGroup
    dataset_groups = list(
        filter(
            lambda x: x["name"] == name,
            personalize.list_dataset_groups()["datasetGroups"],
        )
    )
    if not dataset_groups:
        logger.info(f"There is no dataset_groups with name: {name}")
        raise Exception("There is no dataset_groups to delete")
    dataset_group_arn = dataset_groups[0]["datasetGroupArn"]

    # Fetch Datasets and schemas
    datasets = personalize.list_datasets(datasetGroupArn=dataset_group_arn)["datasets"]
    dataset_arns = []
    schema_arns = []
    for el in datasets:
        dataset_arns.append(el["datasetArn"])
        dataset = personalize.describe_dataset(datasetArn=el["datasetArn"])["dataset"]
        schema_arns.append(dataset["schemaArn"])

    # Fetch Event Trackes
    event_tracker_arns = []
    event_trackers = personalize.list_event_trackers(datasetGroupArn=dataset_group_arn)[
        "eventTrackers"
    ]
    for el in event_trackers:
        event_tracker_arns.append(el["eventTrackerArn"])

    # Fetch Solutions
    solution_arns = []
    solutions = personalize.list_solutions(datasetGroupArn=dataset_group_arn)[
        "solutions"
    ]
    for el in solutions:
        solution_arns.append(el["solutionArn"])

    # Fetch Campaigns
    campaign_arns = []
    for solution_arn in solution_arns:
        campaigns = personalize.list_campaigns(solutionArn=solution_arn)["campaigns"]
        for campaign in campaigns:
            campaign_arns.append(campaign["campaignArn"])

    # Fetch Recommenders
    recommender_arns = []
    recommenders = personalize.list_recommenders(datasetGroupArn=dataset_group_arn)[
        "recommenders"
    ]
    for recommender in recommenders:
        recommender_arns.append(recommender["recommenderArn"])

    return {
        "next": "RECOMMENDER",
        "recommender_arns": recommender_arns,
        "campaign_arns": campaign_arns,
        "solution_arns": solution_arns,
        "event_tracker_arns": event_tracker_arns,
        "dataset_arns": dataset_arns,
        "schema_arns": schema_arns,
        "dataset_group_arn": dataset_group_arn,
    }
