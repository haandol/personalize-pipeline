import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';

interface Props extends cdk.StackProps {
  vpcId: string;
  vpceId?: string;
  vpceSecurityGroupIds?: string[];
  availabilityZones?: string[];
}

export class VpcStack extends cdk.Stack {
  public readonly vpc: ec2.IVpc;
  public readonly apigwVpcEndpoint: ec2.IInterfaceVpcEndpoint;

  constructor(scope: cdk.Construct, id: string, props: Props) {
    super(scope, id, props);

    const ns = scope.node.tryGetContext('ns');

    this.vpc = ec2.Vpc.fromLookup(this, `Vpc`, { vpcId: props.vpcId });

    if (props.vpceId && props.vpceSecurityGroupIds) {
      const securityGroups: ec2.ISecurityGroup[] = props.vpceSecurityGroupIds.map((securityGroupId, index) => {
        return ec2.SecurityGroup.fromSecurityGroupId(this, `VpcEndpointSecGrp${index}`, securityGroupId);
      });
      this.apigwVpcEndpoint = ec2.InterfaceVpcEndpoint.fromInterfaceVpcEndpointAttributes(this, `${ns}ApigwVpcEndpoint`, {
        vpcEndpointId: props.vpceId,
        securityGroups,
        port: 443,
      });
    } else if (props.availabilityZones) {
      this.apigwVpcEndpoint = new ec2.InterfaceVpcEndpoint(this, `VpcEndpoint`, {
        vpc: this.vpc,
        service: ec2.InterfaceVpcEndpointAwsService.APIGATEWAY,
        subnets: {
          availabilityZones: props.availabilityZones,
        },
        privateDnsEnabled: true,
      });
    } else {
      throw Error('Insufficient information to setup VPC Endpoint');
    }
  }

}