/* *****************************************************************************
 * * Copyright 2019 Amazon.com, Inc. and its affiliates. All Rights Reserved.  *
 *                                                                             *
 * Licensed under the Amazon Software License (the "License").                 *
 *  You may not use this file except in compliance with the License.           *
 * A copy of the License is located at                                         *
 *                                                                             *
 *  http://aws.amazon.com/asl/                                                 *
 *                                                                             *
 *  or in the "license" file accompanying this file. This file is distributed  *
 *  on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either  *
 *  express or implied. See the License for the specific language governing    *
 *  permissions and limitations under the License.                             *
 * *************************************************************************** *
*/

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

    const securityGroup = new ec2.SecurityGroup(this, `BastionHostSecGrp`, {
      vpc: this.vpc,
    });
    const bastionHost = new ec2.BastionHostLinux(this, `BastionHost`, {
      vpc: this.vpc,
      securityGroup,
      instanceName: `${ns}BastionHost`,
    });
    bastionHost.allowSshAccessFrom(ec2.Peer.anyIpv4());
    bastionHost.connections.allowFrom(bastionHost.connections, ec2.Port.tcp(443))

    this.apigwVpcEndpoint.connections.allowFrom(securityGroup, ec2.Port.tcp(443));
  }

}