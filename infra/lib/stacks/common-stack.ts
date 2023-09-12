import * as path from 'path';
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { SnsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';

interface IProps extends cdk.StackProps {
  notification: {
    emailSender?: string;
    emailReceiver?: string;
    slackWebhook?: string;
    chimeWebhook?: string;
  };
}

export class CommonStack extends cdk.Stack {
  public readonly doneTopic: sns.ITopic;
  public readonly failTopic: sns.ITopic;

  constructor(scope: Construct, id: string, props?: IProps) {
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
    const emailSender = props?.notification.emailSender || '';
    const emailReceiver = props?.notification.emailReceiver || '';
    const slackWebhook = props?.notification.slackWebhook || '';
    const chimeWebhook = props?.notification.chimeWebhook || '';

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
        SENDER: emailSender,
        TO_ADDR: emailReceiver,
        SLACK_WEBHOOK_URL: slackWebhook,
        CHIME_WEBHOOK_URL: chimeWebhook,
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
        SENDER: emailSender,
        TO_ADDR: emailReceiver,
        SLACK_WEBHOOK_URL: slackWebhook,
        CHIME_WEBHOOK_URL: chimeWebhook,
      },
    });
    notifyFailFunction.addEventSource(new SnsEventSource(this.failTopic));
  }
}
