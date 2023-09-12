import boto3
import logging

logger = logging.getLogger("check_ready")
logger.setLevel(logging.INFO)

personalize = boto3.client(service_name="personalize")


def handler(event, context):
    event["status"] = "Invalid"
    logger.info(event)

    stage = event["stage"]
    if stage == "DATASET_GROUP":
        dataset_group_arn = event["dataset_group_arn"]
        event["status"] = check_dataset_group(dataset_group_arn)
    elif stage in ["DATASET", "ITEM_DATASET", "USER_DATASET"]:
        dataset_arn = event["dataset_arn"]
        event["status"] = check_dataset(dataset_arn)
    elif stage in ["DATASET_IMPORT", "ITEM_DATASET_IMPORT", "USER_DATASET_IMPORT"]:
        dataset_import_job_arn = event["dataset_import_job_arn"]
        event["status"] = check_dataset_import_job(dataset_import_job_arn)
    elif stage == "SOLUTION":
        solution_version_arn = event["solution_version_arn"]
        event["status"] = check_solution_version(solution_version_arn)
    elif stage == "CAMPAIGN":
        campaign_arn = event["campaign_arn"]
        event["status"] = check_campaign(campaign_arn)
    else:
        raise RuntimeError(f"Invalid stage: {stage}")

    return event


def check_dataset_group(dataset_group_arn):
    describe_dataset_group_response = personalize.describe_dataset_group(
        datasetGroupArn=dataset_group_arn
    )
    status = describe_dataset_group_response["datasetGroup"]["status"]
    logger.info("DatasetGroup: {}".format(status))
    return status


def check_dataset(dataset_arn):
    # skip creating dataset
    if not dataset_arn:
        return "ACTIVE"

    describe_dataset_response = personalize.describe_dataset(datasetArn=dataset_arn)

    status = describe_dataset_response["dataset"]["status"]
    logger.info("Dataset: {}".format(status))
    return status


def check_dataset_import_job(dataset_import_job_arn):
    # skip creating dataset import job
    if not dataset_import_job_arn:
        return "ACTIVE"

    describe_dataset_import_job_response = personalize.describe_dataset_import_job(
        datasetImportJobArn=dataset_import_job_arn
    )

    dataset_import_job = describe_dataset_import_job_response["datasetImportJob"]
    if "latestDatasetImportJobRun" not in dataset_import_job:
        status = dataset_import_job["status"]
        logger.info("DatasetImportJob: {}".format(status))
    else:
        status = dataset_import_job["latestDatasetImportJobRun"]["status"]
        logger.info("LatestDatasetImportJobRun: {}".format(status))
    return status


def check_solution_version(solution_version_arn):
    describe_solution_version_response = personalize.describe_solution_version(
        solutionVersionArn=solution_version_arn
    )
    status = describe_solution_version_response["solutionVersion"]["status"]
    logger.info("SolutionVersion: {}".format(status))
    return status


def check_campaign(campaign_arn):
    # skip creating campaign
    if not campaign_arn:
        return "ACTIVE"

    describe_campaign_response = personalize.describe_campaign(campaignArn=campaign_arn)
    status = describe_campaign_response["campaign"]["status"]
    logger.info("Campaign: {}".format(status))
    return status
