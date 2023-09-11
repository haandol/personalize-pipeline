import boto3
import logging

logger = logging.getLogger('list-filter-arns')
logger.setLevel(logging.INFO)

personalize = boto3.client('personalize')


def handler(event, context):
    logger.info(event)

    name = event['name']

    dataset_group_arn = ''
    dataset_groups_response = personalize.list_dataset_groups(maxResults=100)
    for dataset_group in dataset_groups_response['datasetGroups']:
        if dataset_group['name'] == name:
            dataset_group_arn = dataset_group['datasetGroupArn']
            break
    if not dataset_group_arn:
        raise RuntimeError(f'There is no dataset group for name: {name}')

    list_filters_response = personalize.list_filters(
        datasetGroupArn=dataset_group_arn,
        maxResults=100,
    )

    filter_list = []
    for _filter in list_filters_response['Filters']:
        filter_list.append({
            'name': _filter['name'],
            'filter_arn': _filter['filterArn'],
        })
 
    return filter_list