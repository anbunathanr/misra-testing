/**
 * VPC Configuration for Production Lambda Functions
 * Provides secure network isolation and configuration for Lambda functions
 */

import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface VpcConfigProps {
  environment: 'dev' | 'staging' | 'production';
  enableNatGateway: boolean;
  enableVpcEndpoints: boolean;
  cidrBlock?: string;
}

export class VpcConfig extends Construct {
  public readonly vpc: ec2.Vpc;
  private _lambdaSecurityGroup!: ec2.SecurityGroup;
  private _databaseSecurityGroup!: ec2.SecurityGroup;
  public readonly privateSubnets: ec2.ISubnet[];
  public readonly publicSubnets: ec2.ISubnet[];

  public get lambdaSecurityGroup(): ec2.SecurityGroup {
    return this._lambdaSecurityGroup;
  }

  public get databaseSecurityGroup(): ec2.SecurityGroup {
    return this._databaseSecurityGroup;
  }

  constructor(scope: Construct, id: string, props: VpcConfigProps) {
    super(scope, id);

    const { environment, enableNatGateway, enableVpcEndpoints, cidrBlock } = props;

    // Create VPC with public and private subnets
    this.vpc = new ec2.Vpc(this, 'MisraVpc', {
      vpcName: `misra-platform-vpc-${environment}`,
      cidr: cidrBlock || '10.0.0.0/16',
      maxAzs: 2, // Use 2 AZs for high availability
      enableDnsHostnames: true,
      enableDnsSupport: true,
      
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 28,
          name: 'Isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],

      // NAT Gateway configuration
      natGateways: enableNatGateway ? 2 : 0, // One per AZ for production
      natGatewayProvider: enableNatGateway 
        ? ec2.NatProvider.gateway() 
        : ec2.NatProvider.instance({
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.NANO),
          }),
    });

    // Get subnet references
    this.privateSubnets = this.vpc.privateSubnets;
    this.publicSubnets = this.vpc.publicSubnets;

    // Create security groups
    this.createSecurityGroups(environment);

    // Create VPC endpoints for AWS services (production only)
    if (enableVpcEndpoints && environment === 'production') {
      this.createVpcEndpoints();
    }

    // Add flow logs for security monitoring
    this.createFlowLogs(environment);

    // Tag resources
    this.tagResources(environment);
  }

  /**
   * Create security groups for different tiers
   */
  private createSecurityGroups(environment: string) {
    // Lambda Security Group - Restrictive outbound rules
    this._lambdaSecurityGroup = new ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
      vpc: this.vpc,
      securityGroupName: `misra-platform-lambda-sg-${environment}`,
      description: 'Security group for MISRA Platform Lambda functions',
      allowAllOutbound: false, // Explicit outbound rules only
    });

    // Allow HTTPS outbound for AWS API calls
    this._lambdaSecurityGroup.addEgressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'HTTPS outbound for AWS APIs'
    );

    // Allow HTTP outbound for package downloads (if needed)
    this._lambdaSecurityGroup.addEgressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'HTTP outbound for package downloads'
    );

    // Allow DNS resolution
    this._lambdaSecurityGroup.addEgressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.udp(53),
      'DNS resolution'
    );

    this._lambdaSecurityGroup.addEgressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(53),
      'DNS resolution over TCP'
    );

    // Database Security Group - Only allow access from Lambda
    this._databaseSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc: this.vpc,
      securityGroupName: `misra-platform-db-sg-${environment}`,
      description: 'Security group for database access',
      allowAllOutbound: false,
    });

    // Allow Lambda to access DynamoDB via VPC endpoint (port 443)
    this._databaseSecurityGroup.addIngressRule(
      this._lambdaSecurityGroup,
      ec2.Port.tcp(443),
      'Lambda to DynamoDB via VPC endpoint'
    );

    // Allow Lambda to access S3 via VPC endpoint (port 443)
    this._databaseSecurityGroup.addIngressRule(
      this._lambdaSecurityGroup,
      ec2.Port.tcp(443),
      'Lambda to S3 via VPC endpoint'
    );
  }

  /**
   * Create VPC endpoints for AWS services to avoid internet traffic
   */
  private createVpcEndpoints() {
    // DynamoDB VPC Endpoint (Gateway endpoint - no charge)
    this.vpc.addGatewayEndpoint('DynamoDbEndpoint', {
      service: ec2.GatewayVpcEndpointAwsService.DYNAMODB,
      subnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }],
    });

    // S3 VPC Endpoint (Gateway endpoint - no charge)
    this.vpc.addGatewayEndpoint('S3Endpoint', {
      service: ec2.GatewayVpcEndpointAwsService.S3,
      subnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }],
    });

    // Lambda VPC Endpoint (Interface endpoint - charges apply)
    this.vpc.addInterfaceEndpoint('LambdaEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.LAMBDA,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [this._lambdaSecurityGroup],
    });

    // CloudWatch Logs VPC Endpoint
    this.vpc.addInterfaceEndpoint('CloudWatchLogsEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [this._lambdaSecurityGroup],
    });

    // CloudWatch Monitoring VPC Endpoint
    this.vpc.addInterfaceEndpoint('CloudWatchEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_MONITORING,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [this._lambdaSecurityGroup],
    });

    // Secrets Manager VPC Endpoint
    this.vpc.addInterfaceEndpoint('SecretsManagerEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [this._lambdaSecurityGroup],
    });

    // KMS VPC Endpoint
    this.vpc.addInterfaceEndpoint('KmsEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.KMS,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [this._lambdaSecurityGroup],
    });

    // STS VPC Endpoint (for IAM role assumptions)
    this.vpc.addInterfaceEndpoint('StsEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.STS,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [this._lambdaSecurityGroup],
    });
  }

  /**
   * Create VPC Flow Logs for security monitoring
   */
  private createFlowLogs(environment: string) {
    // Create CloudWatch log group for VPC flow logs
    const flowLogGroup = new logs.LogGroup(this, 'VpcFlowLogGroup', {
      logGroupName: `/aws/vpc/flowlogs/${environment}`,
      retention: environment === 'production' 
        ? logs.RetentionDays.ONE_MONTH 
        : logs.RetentionDays.ONE_WEEK,
      removalPolicy: environment === 'production' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
    });

    // Create IAM role for VPC Flow Logs
    const flowLogRole = new iam.Role(this, 'VpcFlowLogRole', {
      roleName: `misra-platform-vpc-flow-log-role-${environment}`,
      assumedBy: new iam.ServicePrincipal('vpc-flow-logs.amazonaws.com'),
      description: 'IAM role for VPC Flow Logs',
    });

    flowLogRole.addToPolicy(new iam.PolicyStatement({
      sid: 'CloudWatchLogsPermissions',
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
        'logs:DescribeLogGroups',
        'logs:DescribeLogStreams',
      ],
      resources: [flowLogGroup.logGroupArn],
    }));

    // Create VPC Flow Logs
    new ec2.FlowLog(this, 'VpcFlowLog', {
      flowLogName: `misra-platform-vpc-flow-log-${environment}`,
      resourceType: ec2.FlowLogResourceType.fromVpc(this.vpc),
      destination: ec2.FlowLogDestination.toCloudWatchLogs(flowLogGroup, flowLogRole),
      trafficType: ec2.FlowLogTrafficType.ALL,
    });
  }

  /**
   * Tag all VPC resources
   */
  private tagResources(environment: string) {
    const tags = {
      Environment: environment,
      Project: 'MISRA-Platform',
      Component: 'VPC',
      ManagedBy: 'CDK',
    };

    Object.entries(tags).forEach(([key, value]) => {
      cdk.Tags.of(this.vpc).add(key, value);
      cdk.Tags.of(this._lambdaSecurityGroup).add(key, value);
      cdk.Tags.of(this._databaseSecurityGroup).add(key, value);
    });
  }

  /**
   * Get Lambda VPC configuration
   */
  public getLambdaVpcConfig(): {
    vpcId: string;
    subnetIds: string[];
    securityGroupIds: string[];
  } {
    return {
      vpcId: this.vpc.vpcId,
      subnetIds: this.privateSubnets.map(subnet => subnet.subnetId),
      securityGroupIds: [this._lambdaSecurityGroup.securityGroupId],
    };
  }

  /**
   * Create outputs for reference by other stacks
   */
  public createOutputs(scope: Construct, stackName: string) {
    new cdk.CfnOutput(scope, 'VpcId', {
      value: this.vpc.vpcId,
      description: 'VPC ID',
      exportName: `${stackName}-VpcId`,
    });

    new cdk.CfnOutput(scope, 'PrivateSubnetIds', {
      value: this.privateSubnets.map(subnet => subnet.subnetId).join(','),
      description: 'Private Subnet IDs',
      exportName: `${stackName}-PrivateSubnetIds`,
    });

    new cdk.CfnOutput(scope, 'PublicSubnetIds', {
      value: this.publicSubnets.map(subnet => subnet.subnetId).join(','),
      description: 'Public Subnet IDs',
      exportName: `${stackName}-PublicSubnetIds`,
    });

    new cdk.CfnOutput(scope, 'LambdaSecurityGroupId', {
      value: this._lambdaSecurityGroup.securityGroupId,
      description: 'Lambda Security Group ID',
      exportName: `${stackName}-LambdaSecurityGroupId`,
    });

    new cdk.CfnOutput(scope, 'DatabaseSecurityGroupId', {
      value: this._databaseSecurityGroup.securityGroupId,
      description: 'Database Security Group ID',
      exportName: `${stackName}-DatabaseSecurityGroupId`,
    });
  }
}