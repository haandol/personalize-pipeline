#!/usr/bin/env python
# coding: utf-8
import os
import csv
import json
import boto3
import logging
import requests

logging.basicConfig(
    format='[%(levelname)s] %(asctime)s - %(message)s',
    level=logging.INFO,
)

SIMILAR_ITEMS_ARN = os.environ.get('SIMILAR_ITEMS_ARN', '')
USER_PERSONALIZATION_ARN = os.environ.get('USER_PERSONALIZATION_ARN', '')
REGION = os.environ.get('AWS_DEFAULT_REGION', 'us-east-1')


def get_apigw_addr():
    cfn = boto3.client('cloudformation', region_name=REGION)
    return cfn.describe_stacks(
        StackName='PersonalizePipelineDemoDevApiGatewayStack'
    )['Stacks'][0]['Outputs'][0]['OutputValue']


def get_movies(path):
    reader = csv.reader(open(path, 'r'))
    next(iter(reader))
    D = {}
    for movie_id, title, genres in reader:
        D[movie_id] = {
            'id': movie_id,
            'title': title,
            'genres': genres,
        }
    return D


def recommend_similar_items(base_url, item_id, num_results=10):
    if not SIMILAR_ITEMS_ARN:
        logging.error('SIMILAR_ITEMS_ARN should be setted to invoke recommend_similar_items. use `export SIMILAR_ITEMS_ARN` in terminal')
        return []

    params = {
        'campaign_arn': SIMILAR_ITEMS_ARN,
        'item_id': item_id,
        'num_results': num_results,
    }
    resp = requests.get(f'{base_url}/personalize/recommend/similar-items', params=params)
    return resp.json()['itemList']


def recommend_user_personalization(base_url, user_id, num_results=10):
    if not USER_PERSONALIZATION_ARN:
        logging.error('USER_PERSONALIZATION_ARN should be setted to invoke recommend_user_personalization. use `export USER_PERSONALIZATION_ARN` in terminal')
        return []

    params = {
        'campaign_arn': USER_PERSONALIZATION_ARN,
        'user_id': user_id,
        'num_results': num_results,
    }
    resp = requests.get(f'{base_url}/personalize/recommend/user-personalization', params=params)
    return resp.json()['itemList']


def convert_item_to_movies(movies, items):
    return [movies[item['itemId']] for item in items]


if __name__ == '__main__':
    APIGW = get_apigw_addr()
    path = 'movielens/movies.csv'

    movies = get_movies(path)

    items = recommend_similar_items(APIGW, '1')
    if items:
        logging.info('SimliarItems: \n{}'.format(json.dumps(convert_item_to_movies(movies, items), indent=2)))

    items = recommend_user_personalization(APIGW, '242')
    if items:
        logging.info('UserPersonalization: \n{}'.format(json.dumps(convert_item_to_movies(movies, items), indent=2)))
