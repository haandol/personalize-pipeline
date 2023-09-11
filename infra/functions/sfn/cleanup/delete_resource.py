import boto3
import logging

logger = logging.getLogger('delete_resource')
logger.setLevel(logging.INFO)

personalize = boto3.client('personalize')


def handler(event, context):
    event['stage'] = event['next']
    event['status'] = 'Invalid'
    logger.info(event)

    stage = event['stage']
    if stage == 'CAMPAIGN':
        logger.info('delete campaign...')
        for campaign_arn in event['campaign_arns']:
            personalize.delete_campaign(campaignArn=campaign_arn)
    elif stage == 'SOLUTION':
        logger.info('delete solution...')
        for solution_arn in event['solution_arns']:
            personalize.delete_solution(solutionArn=solution_arn)
    elif stage == 'EVENT_TRACKER':
        logger.info('delete event_tracker...')
        for event_tracker_arn in event['event_tracker_arns']:
            personalize.delete_event_tracker(eventTrackerArn=event_tracker_arn)
    elif stage == 'DATASET':
        logger.info('delete dataset...')
        for dataset_arn in event['dataset_arns']:
            personalize.delete_dataset(datasetArn=dataset_arn)
    elif stage == 'SCHEMA':
        logger.info('delete schema...')
        for schema_arn in event['schema_arns']:
            try:
                personalize.delete_schema(schemaArn=schema_arn)
            except:
                logger.warn(f'Could not delete schema: {schema_arn}')
    elif stage == 'DATASET_GROUP':
        logger.info('delete dataset group...')
        dataset_group_arn = event['dataset_group_arn']
        personalize.delete_dataset_group(datasetGroupArn=dataset_group_arn)
    else:
        raise RuntimeError(f'Invalid stage: {stage}')
    
    return event