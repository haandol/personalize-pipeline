import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

interface Props extends cdk.StackProps {
  vpcId: string;
  vpceId: string;
  vpceSecurityGroupIds: string[];
}

export class VpcStack extends cdk.Stack {
  public readonly vpc?: ec2.IVpc;
  public readonly apigwVpcEndpoint?: ec2.IInterfaceVpcEndpoint;

  constructor(scope: Construct, id: string, props?: Props) {
    super(scope, id, props);

    this.vpc = this.getOrCreateVpc(props?.vpcId);
    this.apigwVpcEndpoint = this.getOrCreateVpcEndpoint(
      props?.vpceId,
      props?.vpceSecurityGroupIds
    );
  }

  private getOrCreateVpc(vpcId?: string) {
    if (!!vpcId) {
      return ec2.Vpc.fromLookup(this, `Vpc`, { vpcId });
    } else {
      return undefined;
    }
  }

  private getOrCreateVpcEndpoint(
    vpceId?: string,
    vpceSecurityGroupIds?: string[]
  ): ec2.IInterfaceVpcEndpoint | undefined {
    if (!this.vpc) {
      return undefined;
    }

    if (!!vpceId) {
      if (!vpceSecurityGroupIds) {
        throw Error(
          'vpceSecurityGroupIds should be provided along with vpceId.'
        );
      }

      const securityGroups: ec2.ISecurityGroup[] = vpceSecurityGroupIds.map(
        (securityGroupId, index) => {
          return ec2.SecurityGroup.fromSecurityGroupId(
            this,
            `VpcEndpointSecGrp${index}`,
            securityGroupId
          );
        }
      );
      return ec2.InterfaceVpcEndpoint.fromInterfaceVpcEndpointAttributes(
        this,
        `ApigwVpcEndpoint`,
        {
          vpcEndpointId: vpceId,
          securityGroups,
          port: 443,
        }
      );
    } else {
      return new ec2.InterfaceVpcEndpoint(this, `VpcEndpoint`, {
        vpc: this.vpc,
        service: ec2.InterfaceVpcEndpointAwsService.APIGATEWAY,
        privateDnsEnabled: true,
      });
    }
  }
}
