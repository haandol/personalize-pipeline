import json
import boto3
import logging

logger = logging.getLogger('create_solution')
logger.setLevel(logging.INFO)

personalize = boto3.client(service_name='personalize')


def handler(event, context):
    logger.info(event)

    name = event['name']
    dataset_group_arn = event['dataset_group_arn']
    recipe_arn = 'arn:aws:personalize:::recipe/aws-personalized-ranking'

    solution_params = dict(
        name=name,
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
        solutionArn=solution_arn
    )
    solution_version_arn = create_solution_version_response['solutionVersionArn']
    logger.info(json.dumps(create_solution_version_response, indent=2))

    event.update({
        'stage': 'SOLUTION',
        'recipe_arn': recipe_arn,
        'solution_arn': solution_arn,
        'solution_version_arn': solution_version_arn,
    })
    return event