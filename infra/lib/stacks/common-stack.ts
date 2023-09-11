import * as path from 'path';
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { SnsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';

export class CommonStack extends cdk.Stack {
  public readonly doneTopic: sns.ITopic;
  public readonly failTopic: sns.ITopic;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const role = new iam.Role(this, 'NotifyLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        {
          managedPolicyArn:
            'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
        },
      ],
    });
    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ['SES:SendEmail', 'SES:SendRawEmail'],
        resources: ['*'],
      })
    );

    // Common Topics
    this.doneTopic = new sns.Topic(this, 'DoneTopic');
    this.failTopic = new sns.Topic(this, 'FailTopic');

    // Notification
    const notifySender = scope.node.tryGetContext('notifySender') || '';
    const notifyEmail = scope.node.tryGetContext('notifyEmail') || '';
    const notifySlack = scope.node.tryGetContext('notifySlack') || '';
    const notifyChime = scope.node.tryGetContext('notifyChime') || '';

    const notifyDoneFunction = new lambda.Function(this, 'NotifyDoneFunction', {
      runtime: lambda.Runtime.PYTHON_3_7,
      code: lambda.Code.fromAsset(
        path.resolve(__dirname, '..', '..', 'functions', 'common')
      ),
      handler: 'notify.handler',
      role,
      timeout: cdk.Duration.seconds(5),
      environment: {
        STATUS: 'DONE',
        SENDER: notifySender,
        TO_ADDR: notifyEmail,
        SLACK_WEBHOOK_URL: notifySlack,
        CHIME_WEBHOOK_URL: notifyChime,
      },
    });
    notifyDoneFunction.addEventSource(new SnsEventSource(this.doneTopic));

    const notifyFailFunction = new lambda.Function(this, 'NotifyFailFunction', {
      runtime: lambda.Runtime.PYTHON_3_7,
      code: lambda.Code.fromAsset(
        path.resolve(__dirname, '..', '..', 'functions', 'common')
      ),
      handler: 'notify.handler',
      role,
      timeout: cdk.Duration.seconds(5),
      environment: {
        STATUS: 'FAILED',
        SENDER: notifySender,
        TO_ADDR: notifyEmail,
        SLACK_WEBHOOK_URL: notifySlack,
        CHIME_WEBHOOK_URL: notifyChime,
      },
    });
    notifyFailFunction.addEventSource(new SnsEventSource(this.failTopic));
  }
}
