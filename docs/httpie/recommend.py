#!/usr/bin/env python
# coding: utf-8
import os
import csv
import json
import boto3
import requests
from pprint import pprint

SIMS_ARN = os.environ.get('SIMS_ARN', '')
HRNN_ARN = os.environ.get('HRNN_ARN', '')


def get_apigw_addr():
    cfn = boto3.client('cloudformation')
    return cfn.describe_stacks(
        StackName='PersonalizePipelineDevApiGatewayStack'
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
    params = {
        'campaign_arn': SIMS_ARN,
        'item_id': item_id,
        'num_results': 10
    }
    resp = requests.get(f'{APIGW}/personalize/recommend/sims', params=params)
    return resp.json()['itemList']


def recommend_hrnn(base_url, user_id, num_results=10):
    params = {
        'campaign_arn': HRNN_ARN,
        'user_id': user_id,
        'num_results': 10
    }
    resp = requests.get(f'{APIGW}/personalize/recommend/hrnn', params=params)
    return resp.json()['itemList']


def convert_item_to_movies(movies, items):
    return [movies[item['itemId']] for item in items]


if __name__ == '__main__':
    APIGW = get_apigw_addr()
    path = 'movielens/movies.csv'

    movies = get_movies(path)

    items = recommend_sims(APIGW, '1')
    print(json.dumps(convert_item_to_movies(movies, items), indent=2))

    '''
    items = recommend_hrnn(APIGW, '242')
    print(json.dumps(convert_item_to_movies(movies, items), indent=2))
    '''
