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
  vpcId?: string;
  vpceId?: string;
  vpceSecurityGroupIds?: string[];
  bastionHost: boolean;
}

export class VpcStack extends cdk.Stack {
  public readonly vpc?: ec2.IVpc;
  public readonly apigwVpcEndpoint?: ec2.IInterfaceVpcEndpoint;

  constructor(scope: cdk.Construct, id: string, props: Props) {
    super(scope, id, props);

    this.vpc = this.getOrCreateVpc(props.vpcId)
    this.apigwVpcEndpoint =  this.getOrCreateVpcEndpoint(props.vpceId, props.vpceSecurityGroupIds)
    this.createBastionHost(props.bastionHost)
  }

  private getOrCreateVpc(vpcId?: string) {
    if (!!vpcId) {
      return ec2.Vpc.fromLookup(this, `Vpc`, { vpcId });
    } else {
      return undefined
    }
  }

  private getOrCreateVpcEndpoint(vpceId?: string, vpceSecurityGroupIds?: string[]): ec2.IInterfaceVpcEndpoint | undefined {
    if (!this.vpc) {
      return undefined
    }

    if (!!vpceId) {
      if (!vpceSecurityGroupIds) {
        throw Error('vpceSecurityGroupIds should be provided along with vpceId.')
      }

      const securityGroups: ec2.ISecurityGroup[] = vpceSecurityGroupIds.map((securityGroupId, index) => {
        return ec2.SecurityGroup.fromSecurityGroupId(this, `VpcEndpointSecGrp${index}`, securityGroupId);
      });
      return ec2.InterfaceVpcEndpoint.fromInterfaceVpcEndpointAttributes(this, `ApigwVpcEndpoint`, {
        vpcEndpointId: vpceId,
        securityGroups,
        port: 443,
      });
    } else {
      return new ec2.InterfaceVpcEndpoint(this, `VpcEndpoint`, {
        vpc: this.vpc,
        service: ec2.InterfaceVpcEndpointAwsService.APIGATEWAY,
        privateDnsEnabled: true,
      });
    } 
  }

  private createBastionHost(isCreate: boolean): void {
    if (!this.vpc || !this.apigwVpcEndpoint || !isCreate) {
      return
    }

    const securityGroup = new ec2.SecurityGroup(this, `BastionHostSecGrp`, { vpc: this.vpc });
    const bastionHost = new ec2.BastionHostLinux(this, `BastionHost`, {
      vpc: this.vpc,
      securityGroup,
      instanceName: `${cdk.Stack.of(this).stackName}BastionHost`,
    });
    bastionHost.allowSshAccessFrom(ec2.Peer.anyIpv4());
    bastionHost.connections.allowFrom(bastionHost.connections, ec2.Port.tcp(443))
    this.apigwVpcEndpoint.connections.allowFrom(securityGroup, ec2.Port.tcp(443));
  }

}