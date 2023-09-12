import boto3
import logging

logger = logging.getLogger("check_batch_ready")
logger.setLevel(logging.INFO)

personalize = boto3.client(service_name="personalize")


def handler(event, context):
    logger.info(event)

    batch_inference_job_arn = event["batch_inference_job_arn"]
    event["status"] = check_batch_inference_job(batch_inference_job_arn)
    return event


def check_batch_inference_job(batch_inference_job_arn):
    describe_batch_inference_job_response = personalize.describe_batch_inference_job(
        batchInferenceJobArn=batch_inference_job_arn
    )
    status = describe_batch_inference_job_response["batchInferenceJob"]["status"]
    logger.info("BatchInferenceJob: {}".format(status))
    return status
