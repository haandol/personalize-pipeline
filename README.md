# Amazon Personalize Pipeline

Manage resources of Amazon Personalize using API Gateway

<img src="docs/img/overview.png" />
<img src="docs/img/pipeline.png" />

**Running this repository may cost you to provision AWS resources**

# Prerequisites

- awscli
- Nodejs 14+
- Python 3.10+
- AWS Account and Locally configured AWS credential

# Installation

Install project dependencies

```bash
$ cd infra
$ npm i
```

Install cdk in global context and run `cdk bootstrap` if you did not initailize cdk yet.

```bash
$ npm i -g cdk@2.95.1
$ cdk bootstrap
```

Deploy CDK Stacks on AWS

```bash
$ cdk deploy "*" --require-approval never
```

# API Specification

APIs provided this repository are self-documented using API Gateway Models.

1. Export **Swagger** your API specification on [**API Gateway Console**](https://ap-northeast-2.console.aws.amazon.com/apigateway/main/apis?region=ap-northeast-2)

<img src="docs/img/swagger1.png">

2. place it at **swagger/swagger.json**

3. Run Swagger UI using Docker

```bash
$ docker-compose up
```

5. Visit `localhost:80`

> You should set SSH Tunneling via BastionHost to invoke API on localhost

<img src="docs/img/swagger2.png">

# Usage

1. Verify your email on [**Amazon SES Console**](https://console.aws.amazon.com/ses/home?region=ap-northeast-2#verified-senders-email:)

**If you are not yet request increasing SES limitation, you can only send email to verified email.**

2. open [**config.ts**](infra/libs/interfaces/config.ts) and replace values for your environment

3. Create S3 Bucket on [**AWS S3 Console**](https://console.aws.amazon.com/s3/home)

4. Generate _csv_ file by following intructions of [**Amazon Personalize Samples**](https://github.com/aws-samples/amazon-personalize-samples/blob/master/core_use_cases/related_items/personalize_sims_example.ipynb)

5. Upload _csv_ file to _S3 Bucket_

## Connect to BastionHost

1. Visit EC2 Service page on Console and copy Instance-id for BastionHost

> You can get Instance-id for BastionHost from `cdk deploy` also.

2. Connect to BastionHost using SSM

```bash
$ aws ssm start-session --target i-0f956edfbb92e272e

Starting session with SessionId: dongkyl.test-0bc606182f76f4391
sh-4.2$
```

3. Install python3 and [**Httpie**](https://httpie.org/)

```bash
sh-4.2$ sudo yum install python3
sh-4.2$ pip3 install --user httpie
```

## Create SIMS Campaign

1. Create Schema

```bash
$ http post https://f5crbjcb3k.execute-api.ap-northeast-2.amazonaws.com/dev/personalize/schema name=my-demo-schema schema={"type": "record", "name": "Interactions", "namespace": "com.amazonaws.personalize.schema", "fields": [{"name": "USER_ID", "type": "string"}, {"name": "ITEM_ID", "type": "string"}, {"name": "TIMESTAMP", "type": "long"}], "version": "1.0"}
```

2. Invoke api to create Personalize SIMS campaign

```bash
$ http post https://f5crbjcb3k.execute-api.ap-northeast-2.amazonaws.com/dev/personalize/sims name=my-sims-model schema="arn:aws:personalize:ap-northeast-2:776556808198:schema/my-demo-schema" bucket="s3://demo-sims-67914/DEMO-sims.csv"
```

## Invoke API to get recommendations

1. Invoke api to get list of campaign_arn and copy your campaign arn

```bash
$ http post https://f5crbjcb3k.execute-api.ap-northeast-2.amazonaws.com/dev/personalize/campaigns
```

2. Invoke api to get recommendations realtime

```bash
$ http post https://jts3jq4ygi.execute-api.ap-northeast-2.amazonaws.com/dev/personalize/recommend/sims  campaign_arn=arn:aws:personalize:ap-northeast-2:929831892372:campaign/my-sims-model
 item_id=323
```

3. Invoke api to get recommendations in batch

```bash
$ http post https://jts3jq4ygi.execute-api.ap-northeast-2.amazonaws.com/dev/personalize/batch-inference name=my-batch-job solution_version_arn=arn:aws:personalize:ap-northeast-2:929831892372:solution/my-sims-model/84e322ff num_results=150 input_path="s3://demo-sims-67914/batch/input.json" output_path="s3://demo-sims-67914/batch/output/"
```

## Put events

1. Get tracking id for dataset group

```bash
$ http get http post https://jts3jq4ygi.execute-api.ap-northeast-2.amazonaws.com/dev/personalize/tracking name==hrnn-baseline
```

2. Put event via API Gateway

```bash
http post https://jts3jq4ygi.execute-api.ap-northeast-2.amazonaws.com/dev/personalize/events tracking_id=a6006e6f-8623-4684-bda4-33bec98aade9 session_id=hrnn-session-1 event_type=click user_id=242 item_id=88 sent_at=1596258382
```

## Cleanup Resources

1. Invoke api to remove dataset-group

```bash
$ http post https://f5crbjcb3k.execute-api.ap-northeast-2.amazonaws.com/dev/personalize/cleanup name=my-sims-model
```

# Cleanup

destroy provisioned cloud resources

```bash
$ cdk destroy "*"
```
