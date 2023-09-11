import boto3
import logging

logger = logging.getLogger('get_metric')
logger.setLevel(logging.INFO)

client = boto3.client('personalize')


def handler(event, context):
    logger.info(event)

    name = event['name']
    dataset_groups_response = client.list_dataset_groups(maxResults=100)

    dataset_group_arn = ''
    for dataset_group in dataset_groups_response['datasetGroups']:
        if name == dataset_group['name']:
            dataset_group_arn = dataset_group['datasetGroupArn']
            break
    if not dataset_group_arn:
        raise RuntimeError(f'There is no dataset group for name: {name}')

    solution_arn_list = []
    solution_response = client.list_solutions(
        datasetGroupArn=dataset_group_arn,
        maxResults=100
    )
    for solution in solution_response['solutions']:
        solution_arn_list.append(solution['solutionArn'])

    solution_version_arn_list = []
    for solution_arn in solution_arn_list:
        solution_version_response = client.list_solution_versions(
            solutionArn=solution_arn,
            maxResults=100
        )
        for solution_version in solution_version_response['solutionVersions']:
            if 'ACTIVE' == solution_version['status']:
                solution_version_arn_list.append(solution_version['solutionVersionArn'])

    metrics = []
    for solution_version_arn in solution_version_arn_list:
        metric = client.get_solution_metrics(
            solutionVersionArn=solution_version_arn,
        )['metrics']
        metric['solution_version_arn'] = solution_version_arn
        metrics.append(metric)
    metrics.sort(key=lambda x: x['coverage'])
    return metrics