import boto3
import logging

logger = logging.getLogger('check_delete')
logger.setLevel(logging.INFO)

personalize = boto3.client(service_name='personalize')


def handler(event, context):
    logger.info(event)

    stage = event['stage']
    if stage == 'CAMPAIGN':
        event['status'] = is_campaign_deleted(event['solution_arns'])
        if 'DELETED' == event['status']:
            event['next'] = 'SOLUTION'
    elif stage == 'SOLUTION':
        event['status'] = is_solution_deleted(event['dataset_group_arn'])
        if 'DELETED' == event['status']:
            event['next'] = 'EVENT_TRACKER'
    elif stage == 'EVENT_TRACKER':
        event['status'] = is_event_tracker_deleted(event['dataset_group_arn'])
        if 'DELETED' == event['status']:
            event['next'] = 'DATASET'
    elif stage == 'DATASET':
        event['status'] = is_dataset_deleted(event['dataset_group_arn'])
        if 'DELETED' == event['status']:
            event['next'] = 'SCHEMA'
    elif stage == 'SCHEMA':
        event['status'] = is_schema_deleted(event['schema_arns'])
        if 'DELETED' == event['status']:
            event['next'] = 'DATASET_GROUP'
    else:
        raise RuntimeError(f'Invalid stage: {stage}')

    return event


def is_campaign_deleted(solution_arns):
    for solution_arn in solution_arns:
        campaigns = personalize.list_campaigns(solutionArn=solution_arn)['campaigns']
        if campaigns:
            return 'DELETING'
    return 'DELETED'


def is_solution_deleted(dataset_group_arn):
    solutions = personalize.list_solutions(datasetGroupArn=dataset_group_arn)['solutions']
    if solutions:
        return 'DELETING'
    else:
        return 'DELETED'


def is_event_tracker_deleted(dataset_group_arn):
    event_trackers = personalize.list_event_trackers(datasetGroupArn=dataset_group_arn)['eventTrackers']
    if event_trackers:
        return 'DELETING'
    else:
        return 'DELETED'


def is_dataset_deleted(dataset_group_arn):
    datasets = personalize.list_datasets(datasetGroupArn=dataset_group_arn)['datasets']
    if datasets:
        return 'DELETING'
    else:
        return 'DELETED'


def is_schema_deleted(schema_arns):
    return 'DELETED'
    '''
    try:
        for schema_arn in schema_arns:
            personalize.describe_schema(schemaArn=schema_arn)
        return 'DELETING'
    except personalize.exceptions.ResourceNotFoundException:
        logger.info(f'schema has been deleted: {schema_arn}')
        return 'DELETED'
    '''