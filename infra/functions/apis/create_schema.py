import json
import boto3
import logging

logger = logging.getLogger("create-schema")
logger.setLevel(logging.INFO)

personalize = boto3.client(service_name="personalize")


def handler(event, context):
    logger.info(event)

    name = event["name"]
    domain = event.get("domain", None)
    schema = json.dumps(event["schema"])

    params = dict(
        name=name,
        schema=schema,
    )
    if domain in ["VIDEO_ON_DEMAND", "ECOMMERCE"]:
        params.update(dict(domain=domain))

    create_schema_response = personalize.create_schema(**params)
    logger.info(json.dumps(create_schema_response, indent=2))
    schema_arn = create_schema_response["schemaArn"]

    return {"schema_arn": schema_arn}
