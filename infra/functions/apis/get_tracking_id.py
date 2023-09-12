import boto3
import logging

logger = logging.getLogger("get_event_handler")
logger.setLevel(logging.INFO)

personalize = boto3.client("personalize")


def handler(event, context):
    logger.info(event)

    name = event["name"]
    dataset_groups = list(
        filter(
            lambda x: x["name"] == name,
            personalize.list_dataset_groups()["datasetGroups"],
        )
    )
    if not dataset_groups:
        raise RuntimeError(f"There are no DatasetGroup for given name: {name}")

    dataset_group_arn = dataset_groups[0]["datasetGroupArn"]

    event_trackers = personalize.list_event_trackers(datasetGroupArn=dataset_group_arn)[
        "eventTrackers"
    ]
    if not event_trackers:
        raise RuntimeError(
            f"There are no EventTracker for given DatasetGroupArn: {dataset_group_arn}"
        )

    event_tracker_arn = event_trackers[0]["eventTrackerArn"]
    logger.info(f"EventTrackerArn: {event_tracker_arn}")

    event_tracker = personalize.describe_event_tracker(
        eventTrackerArn=event_tracker_arn
    )["eventTracker"]
    return {"name": event_tracker["name"], "trackingId": event_tracker["trackingId"]}
