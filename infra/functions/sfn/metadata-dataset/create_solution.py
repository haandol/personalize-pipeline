import json
import boto3
import logging

logger = logging.getLogger('create_solution')
logger.setLevel(logging.INFO)

personalize = boto3.client(service_name='personalize')


def handler(event, context):
    logger.info(event)

    name = event['name']
    suffix = event['suffix']
    dataset_group_arn = event['dataset_group_arn']
    solution_arn = event.get('solution_arn', '')
    training_mode = event.get('training_mode', 'FULL')
    recipe_arn = 'arn:aws:personalize:::recipe/aws-user-personalization'

    if solution_arn and training_mode == 'UPDATE':
        personalize.describe_solution(solutionArn=solution_arn)

        create_solution_version_response = personalize.create_solution_version(
            solutionArn=solution_arn,
            trainingMode=training_mode,
        )
        solution_version_arn = create_solution_version_response['solutionVersionArn']
        logger.info(json.dumps(create_solution_version_response, indent=2))
    else:
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
            trainingMode=training_mode,
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