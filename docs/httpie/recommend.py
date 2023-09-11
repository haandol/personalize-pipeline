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

SIMS_ARN = os.environ.get('SIMS_ARN', '')
HRNN_ARN = os.environ.get('HRNN_ARN', '')
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


def recommend_sims(base_url, item_id, num_results=10):
    if not SIMS_ARN:
        logging.error('SIMS_ARN should be setted to invoke recommend_sims. use `export SIMS_ARN` in terminal')
        return []

    params = {
        'campaign_arn': SIMS_ARN,
        'item_id': item_id,
        'num_results': num_results,
    }
    resp = requests.get(f'{base_url}/personalize/recommend/sims', params=params)
    return resp.json()['itemList']


def recommend_hrnn(base_url, user_id, num_results=10):
    if not HRNN_ARN:
        logging.error('HRNN_ARN should be setted to invoke recommend_hrnn. use `export HRNN_ARN` in terminal')
        return []

    params = {
        'campaign_arn': HRNN_ARN,
        'user_id': user_id,
        'num_results': num_results,
    }
    resp = requests.get(f'{base_url}/personalize/recommend/hrnn', params=params)
    return resp.json()['itemList']


def convert_item_to_movies(movies, items):
    return [movies[item['itemId']] for item in items]


if __name__ == '__main__':
    APIGW = get_apigw_addr()
    path = 'movielens/movies.csv'

    movies = get_movies(path)

    items = recommend_sims(APIGW, '1')
    if items:
        logging.info('SIMS: \n{}'.format(json.dumps(convert_item_to_movies(movies, items), indent=2)))

    items = recommend_hrnn(APIGW, '242')
    if items:
        logging.info('HRNN: \n{}'.format(json.dumps(convert_item_to_movies(movies, items), indent=2)))
