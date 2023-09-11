import json
import boto3
import logging
from datetime import datetime

logger = logging.getLogger('create_solution')
logger.setLevel(logging.INFO)

personalize = boto3.client(service_name='personalize')


def handler(event, context):
    logger.info(event)

    name = event['name']
    suffix = datetime.now().strftime('%Y%m%dT%H%M%S')

    recipe_arn = event['recipe_arn']
    if not recipe_arn.startswith('arn:aws:personalize:::recipe/'): 
        raise Exception(f'Invalid recipe arn: {recipe_arn}')

    dataset_group_arn = ''
    dataset_groups_response = personalize.list_dataset_groups(maxResults=100)
    for dataset_group in dataset_groups_response['datasetGroups']:
        if dataset_group['name'] == name:
            dataset_group_arn = dataset_group['datasetGroupArn']
            break
    
    if not dataset_group_arn:
        raise RuntimeError(f'There is no datasetgroup for {name}')

    solution_params = dict(
        name=f'{name}-{suffix}',
        performHPO=bool(event.get('perform_hpo', False)),
        datasetGroupArn=dataset_group_arn,
        recipeArn=recipe_arn,
    )
    if event.get('event_type', ''):
        solution_params['eventType'] = event['event_type']
    if event.get('solution_config', {}):
        solution_params['solutionConfig'] = event['solution_config']

    create_solution_response = personalize.create_solution(**solution_params)
    solution_arn = create_solution_response['solutionArn']
    logger.info(json.dumps(create_solution_response, indent=2))

    create_solution_version_response = personalize.create_solution_version(
        solutionArn=solution_arn,
    )
    solution_version_arn = create_solution_version_response['solutionVersionArn']
    logger.info(json.dumps(create_solution_version_response, indent=2))

    event.update({
        'stage': 'SOLUTION',
        'suffix': suffix,
        'dataset_group_arn': dataset_group_arn,
        'solution_arn': solution_arn,
        'solution_version_arn': solution_version_arn,
    })
    return event