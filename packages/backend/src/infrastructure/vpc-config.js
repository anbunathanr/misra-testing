"use strict";
/**
 * VPC Configuration for Production Lambda Functions
 * Provides secure network isolation and configuration for Lambda functions
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.VpcConfig = void 0;
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const cdk = __importStar(require("aws-cdk-lib"));
const constructs_1 = require("constructs");
class VpcConfig extends constructs_1.Construct {
    vpc;
    _lambdaSecurityGroup;
    _databaseSecurityGroup;
    privateSubnets;
    publicSubnets;
    get lambdaSecurityGroup() {
        return this._lambdaSecurityGroup;
    }
    get databaseSecurityGroup() {
        return this._databaseSecurityGroup;
    }
    constructor(scope, id, props) {
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
    createSecurityGroups(environment) {
        // Lambda Security Group - Restrictive outbound rules
        this._lambdaSecurityGroup = new ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
            vpc: this.vpc,
            securityGroupName: `misra-platform-lambda-sg-${environment}`,
            description: 'Security group for MISRA Platform Lambda functions',
            allowAllOutbound: false, // Explicit outbound rules only
        });
        // Allow HTTPS outbound for AWS API calls
        this._lambdaSecurityGroup.addEgressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'HTTPS outbound for AWS APIs');
        // Allow HTTP outbound for package downloads (if needed)
        this._lambdaSecurityGroup.addEgressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'HTTP outbound for package downloads');
        // Allow DNS resolution
        this._lambdaSecurityGroup.addEgressRule(ec2.Peer.anyIpv4(), ec2.Port.udp(53), 'DNS resolution');
        this._lambdaSecurityGroup.addEgressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(53), 'DNS resolution over TCP');
        // Database Security Group - Only allow access from Lambda
        this._databaseSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
            vpc: this.vpc,
            securityGroupName: `misra-platform-db-sg-${environment}`,
            description: 'Security group for database access',
            allowAllOutbound: false,
        });
        // Allow Lambda to access DynamoDB via VPC endpoint (port 443)
        this._databaseSecurityGroup.addIngressRule(this._lambdaSecurityGroup, ec2.Port.tcp(443), 'Lambda to DynamoDB via VPC endpoint');
        // Allow Lambda to access S3 via VPC endpoint (port 443)
        this._databaseSecurityGroup.addIngressRule(this._lambdaSecurityGroup, ec2.Port.tcp(443), 'Lambda to S3 via VPC endpoint');
    }
    /**
     * Create VPC endpoints for AWS services to avoid internet traffic
     */
    createVpcEndpoints() {
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
    createFlowLogs(environment) {
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
    tagResources(environment) {
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
    getLambdaVpcConfig() {
        return {
            vpcId: this.vpc.vpcId,
            subnetIds: this.privateSubnets.map(subnet => subnet.subnetId),
            securityGroupIds: [this._lambdaSecurityGroup.securityGroupId],
        };
    }
    /**
     * Create outputs for reference by other stacks
     */
    createOutputs(scope, stackName) {
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
exports.VpcConfig = VpcConfig;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidnBjLWNvbmZpZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInZwYy1jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7R0FHRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgseURBQTJDO0FBQzNDLHlEQUEyQztBQUMzQywyREFBNkM7QUFDN0MsaURBQW1DO0FBQ25DLDJDQUF1QztBQVN2QyxNQUFhLFNBQVUsU0FBUSxzQkFBUztJQUN0QixHQUFHLENBQVU7SUFDckIsb0JBQW9CLENBQXFCO0lBQ3pDLHNCQUFzQixDQUFxQjtJQUNuQyxjQUFjLENBQWdCO0lBQzlCLGFBQWEsQ0FBZ0I7SUFFN0MsSUFBVyxtQkFBbUI7UUFDNUIsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUM7SUFDbkMsQ0FBQztJQUVELElBQVcscUJBQXFCO1FBQzlCLE9BQU8sSUFBSSxDQUFDLHNCQUFzQixDQUFDO0lBQ3JDLENBQUM7SUFFRCxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXFCO1FBQzdELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsTUFBTSxFQUFFLFdBQVcsRUFBRSxnQkFBZ0IsRUFBRSxrQkFBa0IsRUFBRSxTQUFTLEVBQUUsR0FBRyxLQUFLLENBQUM7UUFFL0UsNkNBQTZDO1FBQzdDLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxVQUFVLEVBQUU7WUFDdkMsT0FBTyxFQUFFLHNCQUFzQixXQUFXLEVBQUU7WUFDNUMsSUFBSSxFQUFFLFNBQVMsSUFBSSxhQUFhO1lBQ2hDLE1BQU0sRUFBRSxDQUFDLEVBQUUsa0NBQWtDO1lBQzdDLGtCQUFrQixFQUFFLElBQUk7WUFDeEIsZ0JBQWdCLEVBQUUsSUFBSTtZQUV0QixtQkFBbUIsRUFBRTtnQkFDbkI7b0JBQ0UsUUFBUSxFQUFFLEVBQUU7b0JBQ1osSUFBSSxFQUFFLFFBQVE7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QUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLGtCQUFrQixFQUFFO1lBQzNDLEtBQUssRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO1lBQ25FLFdBQVcsRUFBRSxvQkFBb0I7WUFDakMsVUFBVSxFQUFFLEdBQUcsU0FBUyxtQkFBbUI7U0FDNUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxpQkFBaUIsRUFBRTtZQUMxQyxLQUFLLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQztZQUNsRSxXQUFXLEVBQUUsbUJBQW1CO1lBQ2hDLFVBQVUsRUFBRSxHQUFHLFNBQVMsa0JBQWtCO1NBQzNDLENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsdUJBQXVCLEVBQUU7WUFDaEQsS0FBSyxFQUFFLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxlQUFlO1lBQ2hELFdBQVcsRUFBRSwwQkFBMEI7WUFDdkMsVUFBVSxFQUFFLEdBQUcsU0FBUyx3QkFBd0I7U0FDakQsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSx5QkFBeUIsRUFBRTtZQUNsRCxLQUFLLEVBQUUsSUFBSSxDQUFDLHNCQUFzQixDQUFDLGVBQWU7WUFDbEQsV0FBVyxFQUFFLDRCQUE0QjtZQUN6QyxVQUFVLEVBQUUsR0FBRyxTQUFTLDBCQUEwQjtTQUNuRCxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUFsVEQsOEJBa1RDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIFZQQyBDb25maWd1cmF0aW9uIGZvciBQcm9kdWN0aW9uIExhbWJkYSBGdW5jdGlvbnNcclxuICogUHJvdmlkZXMgc2VjdXJlIG5ldHdvcmsgaXNvbGF0aW9uIGFuZCBjb25maWd1cmF0aW9uIGZvciBMYW1iZGEgZnVuY3Rpb25zXHJcbiAqL1xyXG5cclxuaW1wb3J0ICogYXMgZWMyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lYzInO1xyXG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XHJcbmltcG9ydCAqIGFzIGxvZ3MgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxvZ3MnO1xyXG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xyXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgVnBjQ29uZmlnUHJvcHMge1xyXG4gIGVudmlyb25tZW50OiAnZGV2JyB8ICdzdGFnaW5nJyB8ICdwcm9kdWN0aW9uJztcclxuICBlbmFibGVOYXRHYXRld2F5OiBib29sZWFuO1xyXG4gIGVuYWJsZVZwY0VuZHBvaW50czogYm9vbGVhbjtcclxuICBjaWRyQmxvY2s/OiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBWcGNDb25maWcgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xyXG4gIHB1YmxpYyByZWFkb25seSB2cGM6IGVjMi5WcGM7XHJcbiAgcHJpdmF0ZSBfbGFtYmRhU2VjdXJpdHlHcm91cCE6IGVjMi5TZWN1cml0eUdyb3VwO1xyXG4gIHByaXZhdGUgX2RhdGFiYXNlU2VjdXJpdHlHcm91cCE6IGVjMi5TZWN1cml0eUdyb3VwO1xyXG4gIHB1YmxpYyByZWFkb25seSBwcml2YXRlU3VibmV0czogZWMyLklTdWJuZXRbXTtcclxuICBwdWJsaWMgcmVhZG9ubHkgcHVibGljU3VibmV0czogZWMyLklTdWJuZXRbXTtcclxuXHJcbiAgcHVibGljIGdldCBsYW1iZGFTZWN1cml0eUdyb3VwKCk6IGVjMi5TZWN1cml0eUdyb3VwIHtcclxuICAgIHJldHVybiB0aGlzLl9sYW1iZGFTZWN1cml0eUdyb3VwO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGdldCBkYXRhYmFzZVNlY3VyaXR5R3JvdXAoKTogZWMyLlNlY3VyaXR5R3JvdXAge1xyXG4gICAgcmV0dXJuIHRoaXMuX2RhdGFiYXNlU2VjdXJpdHlHcm91cDtcclxuICB9XHJcblxyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBWcGNDb25maWdQcm9wcykge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcclxuXHJcbiAgICBjb25zdCB7IGVudmlyb25tZW50LCBlbmFibGVOYXRHYXRld2F5LCBlbmFibGVWcGNFbmRwb2ludHMsIGNpZHJCbG9jayB9ID0gcHJvcHM7XHJcblxyXG4gICAgLy8gQ3JlYXRlIFZQQyB3aXRoIHB1YmxpYyBhbmQgcHJpdmF0ZSBzdWJuZXRzXHJcbiAgICB0aGlzLnZwYyA9IG5ldyBlYzIuVnBjKHRoaXMsICdNaXNyYVZwYycsIHtcclxuICAgICAgdnBjTmFtZTogYG1pc3JhLXBsYXRmb3JtLXZwYy0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIGNpZHI6IGNpZHJCbG9jayB8fCAnMTAuMC4wLjAvMTYnLFxyXG4gICAgICBtYXhBenM6IDIsIC8vIFVzZSAyIEFacyBmb3IgaGlnaCBhdmFpbGFiaWxpdHlcclxuICAgICAgZW5hYmxlRG5zSG9zdG5hbWVzOiB0cnVlLFxyXG4gICAgICBlbmFibGVEbnNTdXBwb3J0OiB0cnVlLFxyXG4gICAgICBcclxuICAgICAgc3VibmV0Q29uZmlndXJhdGlvbjogW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIGNpZHJNYXNrOiAyNCxcclxuICAgICAgICAgIG5hbWU6ICdQdWJsaWMnLFxyXG4gICAgICAgICAgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFVCTElDLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgY2lkck1hc2s6IDI0LFxyXG4gICAgICAgICAgbmFtZTogJ1ByaXZhdGUnLFxyXG4gICAgICAgICAgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9XSVRIX0VHUkVTUyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIGNpZHJNYXNrOiAyOCxcclxuICAgICAgICAgIG5hbWU6ICdJc29sYXRlZCcsXHJcbiAgICAgICAgICBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX0lTT0xBVEVELFxyXG4gICAgICAgIH0sXHJcbiAgICAgIF0sXHJcblxyXG4gICAgICAvLyBOQVQgR2F0ZXdheSBjb25maWd1cmF0aW9uXHJcbiAgICAgIG5hdEdhdGV3YXlzOiBlbmFibGVOYXRHYXRld2F5ID8gMiA6IDAsIC8vIE9uZSBwZXIgQVogZm9yIHByb2R1Y3Rpb25cclxuICAgICAgbmF0R2F0ZXdheVByb3ZpZGVyOiBlbmFibGVOYXRHYXRld2F5IFxyXG4gICAgICAgID8gZWMyLk5hdFByb3ZpZGVyLmdhdGV3YXkoKSBcclxuICAgICAgICA6IGVjMi5OYXRQcm92aWRlci5pbnN0YW5jZSh7XHJcbiAgICAgICAgICAgIGluc3RhbmNlVHlwZTogZWMyLkluc3RhbmNlVHlwZS5vZihlYzIuSW5zdGFuY2VDbGFzcy5UMywgZWMyLkluc3RhbmNlU2l6ZS5OQU5PKSxcclxuICAgICAgICAgIH0pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gR2V0IHN1Ym5ldCByZWZlcmVuY2VzXHJcbiAgICB0aGlzLnByaXZhdGVTdWJuZXRzID0gdGhpcy52cGMucHJpdmF0ZVN1Ym5ldHM7XHJcbiAgICB0aGlzLnB1YmxpY1N1Ym5ldHMgPSB0aGlzLnZwYy5wdWJsaWNTdWJuZXRzO1xyXG5cclxuICAgIC8vIENyZWF0ZSBzZWN1cml0eSBncm91cHNcclxuICAgIHRoaXMuY3JlYXRlU2VjdXJpdHlHcm91cHMoZW52aXJvbm1lbnQpO1xyXG5cclxuICAgIC8vIENyZWF0ZSBWUEMgZW5kcG9pbnRzIGZvciBBV1Mgc2VydmljZXMgKHByb2R1Y3Rpb24gb25seSlcclxuICAgIGlmIChlbmFibGVWcGNFbmRwb2ludHMgJiYgZW52aXJvbm1lbnQgPT09ICdwcm9kdWN0aW9uJykge1xyXG4gICAgICB0aGlzLmNyZWF0ZVZwY0VuZHBvaW50cygpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEFkZCBmbG93IGxvZ3MgZm9yIHNlY3VyaXR5IG1vbml0b3JpbmdcclxuICAgIHRoaXMuY3JlYXRlRmxvd0xvZ3MoZW52aXJvbm1lbnQpO1xyXG5cclxuICAgIC8vIFRhZyByZXNvdXJjZXNcclxuICAgIHRoaXMudGFnUmVzb3VyY2VzKGVudmlyb25tZW50KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENyZWF0ZSBzZWN1cml0eSBncm91cHMgZm9yIGRpZmZlcmVudCB0aWVyc1xyXG4gICAqL1xyXG4gIHByaXZhdGUgY3JlYXRlU2VjdXJpdHlHcm91cHMoZW52aXJvbm1lbnQ6IHN0cmluZykge1xyXG4gICAgLy8gTGFtYmRhIFNlY3VyaXR5IEdyb3VwIC0gUmVzdHJpY3RpdmUgb3V0Ym91bmQgcnVsZXNcclxuICAgIHRoaXMuX2xhbWJkYVNlY3VyaXR5R3JvdXAgPSBuZXcgZWMyLlNlY3VyaXR5R3JvdXAodGhpcywgJ0xhbWJkYVNlY3VyaXR5R3JvdXAnLCB7XHJcbiAgICAgIHZwYzogdGhpcy52cGMsXHJcbiAgICAgIHNlY3VyaXR5R3JvdXBOYW1lOiBgbWlzcmEtcGxhdGZvcm0tbGFtYmRhLXNnLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgZGVzY3JpcHRpb246ICdTZWN1cml0eSBncm91cCBmb3IgTUlTUkEgUGxhdGZvcm0gTGFtYmRhIGZ1bmN0aW9ucycsXHJcbiAgICAgIGFsbG93QWxsT3V0Ym91bmQ6IGZhbHNlLCAvLyBFeHBsaWNpdCBvdXRib3VuZCBydWxlcyBvbmx5XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBbGxvdyBIVFRQUyBvdXRib3VuZCBmb3IgQVdTIEFQSSBjYWxsc1xyXG4gICAgdGhpcy5fbGFtYmRhU2VjdXJpdHlHcm91cC5hZGRFZ3Jlc3NSdWxlKFxyXG4gICAgICBlYzIuUGVlci5hbnlJcHY0KCksXHJcbiAgICAgIGVjMi5Qb3J0LnRjcCg0NDMpLFxyXG4gICAgICAnSFRUUFMgb3V0Ym91bmQgZm9yIEFXUyBBUElzJ1xyXG4gICAgKTtcclxuXHJcbiAgICAvLyBBbGxvdyBIVFRQIG91dGJvdW5kIGZvciBwYWNrYWdlIGRvd25sb2FkcyAoaWYgbmVlZGVkKVxyXG4gICAgdGhpcy5fbGFtYmRhU2VjdXJpdHlHcm91cC5hZGRFZ3Jlc3NSdWxlKFxyXG4gICAgICBlYzIuUGVlci5hbnlJcHY0KCksXHJcbiAgICAgIGVjMi5Qb3J0LnRjcCg4MCksXHJcbiAgICAgICdIVFRQIG91dGJvdW5kIGZvciBwYWNrYWdlIGRvd25sb2FkcydcclxuICAgICk7XHJcblxyXG4gICAgLy8gQWxsb3cgRE5TIHJlc29sdXRpb25cclxuICAgIHRoaXMuX2xhbWJkYVNlY3VyaXR5R3JvdXAuYWRkRWdyZXNzUnVsZShcclxuICAgICAgZWMyLlBlZXIuYW55SXB2NCgpLFxyXG4gICAgICBlYzIuUG9ydC51ZHAoNTMpLFxyXG4gICAgICAnRE5TIHJlc29sdXRpb24nXHJcbiAgICApO1xyXG5cclxuICAgIHRoaXMuX2xhbWJkYVNlY3VyaXR5R3JvdXAuYWRkRWdyZXNzUnVsZShcclxuICAgICAgZWMyLlBlZXIuYW55SXB2NCgpLFxyXG4gICAgICBlYzIuUG9ydC50Y3AoNTMpLFxyXG4gICAgICAnRE5TIHJlc29sdXRpb24gb3ZlciBUQ1AnXHJcbiAgICApO1xyXG5cclxuICAgIC8vIERhdGFiYXNlIFNlY3VyaXR5IEdyb3VwIC0gT25seSBhbGxvdyBhY2Nlc3MgZnJvbSBMYW1iZGFcclxuICAgIHRoaXMuX2RhdGFiYXNlU2VjdXJpdHlHcm91cCA9IG5ldyBlYzIuU2VjdXJpdHlHcm91cCh0aGlzLCAnRGF0YWJhc2VTZWN1cml0eUdyb3VwJywge1xyXG4gICAgICB2cGM6IHRoaXMudnBjLFxyXG4gICAgICBzZWN1cml0eUdyb3VwTmFtZTogYG1pc3JhLXBsYXRmb3JtLWRiLXNnLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgZGVzY3JpcHRpb246ICdTZWN1cml0eSBncm91cCBmb3IgZGF0YWJhc2UgYWNjZXNzJyxcclxuICAgICAgYWxsb3dBbGxPdXRib3VuZDogZmFsc2UsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBbGxvdyBMYW1iZGEgdG8gYWNjZXNzIER5bmFtb0RCIHZpYSBWUEMgZW5kcG9pbnQgKHBvcnQgNDQzKVxyXG4gICAgdGhpcy5fZGF0YWJhc2VTZWN1cml0eUdyb3VwLmFkZEluZ3Jlc3NSdWxlKFxyXG4gICAgICB0aGlzLl9sYW1iZGFTZWN1cml0eUdyb3VwLFxyXG4gICAgICBlYzIuUG9ydC50Y3AoNDQzKSxcclxuICAgICAgJ0xhbWJkYSB0byBEeW5hbW9EQiB2aWEgVlBDIGVuZHBvaW50J1xyXG4gICAgKTtcclxuXHJcbiAgICAvLyBBbGxvdyBMYW1iZGEgdG8gYWNjZXNzIFMzIHZpYSBWUEMgZW5kcG9pbnQgKHBvcnQgNDQzKVxyXG4gICAgdGhpcy5fZGF0YWJhc2VTZWN1cml0eUdyb3VwLmFkZEluZ3Jlc3NSdWxlKFxyXG4gICAgICB0aGlzLl9sYW1iZGFTZWN1cml0eUdyb3VwLFxyXG4gICAgICBlYzIuUG9ydC50Y3AoNDQzKSxcclxuICAgICAgJ0xhbWJkYSB0byBTMyB2aWEgVlBDIGVuZHBvaW50J1xyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENyZWF0ZSBWUEMgZW5kcG9pbnRzIGZvciBBV1Mgc2VydmljZXMgdG8gYXZvaWQgaW50ZXJuZXQgdHJhZmZpY1xyXG4gICAqL1xyXG4gIHByaXZhdGUgY3JlYXRlVnBjRW5kcG9pbnRzKCkge1xyXG4gICAgLy8gRHluYW1vREIgVlBDIEVuZHBvaW50IChHYXRld2F5IGVuZHBvaW50IC0gbm8gY2hhcmdlKVxyXG4gICAgdGhpcy52cGMuYWRkR2F0ZXdheUVuZHBvaW50KCdEeW5hbW9EYkVuZHBvaW50Jywge1xyXG4gICAgICBzZXJ2aWNlOiBlYzIuR2F0ZXdheVZwY0VuZHBvaW50QXdzU2VydmljZS5EWU5BTU9EQixcclxuICAgICAgc3VibmV0czogW3sgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9XSVRIX0VHUkVTUyB9XSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFMzIFZQQyBFbmRwb2ludCAoR2F0ZXdheSBlbmRwb2ludCAtIG5vIGNoYXJnZSlcclxuICAgIHRoaXMudnBjLmFkZEdhdGV3YXlFbmRwb2ludCgnUzNFbmRwb2ludCcsIHtcclxuICAgICAgc2VydmljZTogZWMyLkdhdGV3YXlWcGNFbmRwb2ludEF3c1NlcnZpY2UuUzMsXHJcbiAgICAgIHN1Ym5ldHM6IFt7IHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfV0lUSF9FR1JFU1MgfV0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBMYW1iZGEgVlBDIEVuZHBvaW50IChJbnRlcmZhY2UgZW5kcG9pbnQgLSBjaGFyZ2VzIGFwcGx5KVxyXG4gICAgdGhpcy52cGMuYWRkSW50ZXJmYWNlRW5kcG9pbnQoJ0xhbWJkYUVuZHBvaW50Jywge1xyXG4gICAgICBzZXJ2aWNlOiBlYzIuSW50ZXJmYWNlVnBjRW5kcG9pbnRBd3NTZXJ2aWNlLkxBTUJEQSxcclxuICAgICAgc3VibmV0czogeyBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX1dJVEhfRUdSRVNTIH0sXHJcbiAgICAgIHNlY3VyaXR5R3JvdXBzOiBbdGhpcy5fbGFtYmRhU2VjdXJpdHlHcm91cF0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDbG91ZFdhdGNoIExvZ3MgVlBDIEVuZHBvaW50XHJcbiAgICB0aGlzLnZwYy5hZGRJbnRlcmZhY2VFbmRwb2ludCgnQ2xvdWRXYXRjaExvZ3NFbmRwb2ludCcsIHtcclxuICAgICAgc2VydmljZTogZWMyLkludGVyZmFjZVZwY0VuZHBvaW50QXdzU2VydmljZS5DTE9VRFdBVENIX0xPR1MsXHJcbiAgICAgIHN1Ym5ldHM6IHsgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9XSVRIX0VHUkVTUyB9LFxyXG4gICAgICBzZWN1cml0eUdyb3VwczogW3RoaXMuX2xhbWJkYVNlY3VyaXR5R3JvdXBdLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ2xvdWRXYXRjaCBNb25pdG9yaW5nIFZQQyBFbmRwb2ludFxyXG4gICAgdGhpcy52cGMuYWRkSW50ZXJmYWNlRW5kcG9pbnQoJ0Nsb3VkV2F0Y2hFbmRwb2ludCcsIHtcclxuICAgICAgc2VydmljZTogZWMyLkludGVyZmFjZVZwY0VuZHBvaW50QXdzU2VydmljZS5DTE9VRFdBVENIX01PTklUT1JJTkcsXHJcbiAgICAgIHN1Ym5ldHM6IHsgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9XSVRIX0VHUkVTUyB9LFxyXG4gICAgICBzZWN1cml0eUdyb3VwczogW3RoaXMuX2xhbWJkYVNlY3VyaXR5R3JvdXBdLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gU2VjcmV0cyBNYW5hZ2VyIFZQQyBFbmRwb2ludFxyXG4gICAgdGhpcy52cGMuYWRkSW50ZXJmYWNlRW5kcG9pbnQoJ1NlY3JldHNNYW5hZ2VyRW5kcG9pbnQnLCB7XHJcbiAgICAgIHNlcnZpY2U6IGVjMi5JbnRlcmZhY2VWcGNFbmRwb2ludEF3c1NlcnZpY2UuU0VDUkVUU19NQU5BR0VSLFxyXG4gICAgICBzdWJuZXRzOiB7IHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfV0lUSF9FR1JFU1MgfSxcclxuICAgICAgc2VjdXJpdHlHcm91cHM6IFt0aGlzLl9sYW1iZGFTZWN1cml0eUdyb3VwXSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEtNUyBWUEMgRW5kcG9pbnRcclxuICAgIHRoaXMudnBjLmFkZEludGVyZmFjZUVuZHBvaW50KCdLbXNFbmRwb2ludCcsIHtcclxuICAgICAgc2VydmljZTogZWMyLkludGVyZmFjZVZwY0VuZHBvaW50QXdzU2VydmljZS5LTVMsXHJcbiAgICAgIHN1Ym5ldHM6IHsgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9XSVRIX0VHUkVTUyB9LFxyXG4gICAgICBzZWN1cml0eUdyb3VwczogW3RoaXMuX2xhbWJkYVNlY3VyaXR5R3JvdXBdLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gU1RTIFZQQyBFbmRwb2ludCAoZm9yIElBTSByb2xlIGFzc3VtcHRpb25zKVxyXG4gICAgdGhpcy52cGMuYWRkSW50ZXJmYWNlRW5kcG9pbnQoJ1N0c0VuZHBvaW50Jywge1xyXG4gICAgICBzZXJ2aWNlOiBlYzIuSW50ZXJmYWNlVnBjRW5kcG9pbnRBd3NTZXJ2aWNlLlNUUyxcclxuICAgICAgc3VibmV0czogeyBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX1dJVEhfRUdSRVNTIH0sXHJcbiAgICAgIHNlY3VyaXR5R3JvdXBzOiBbdGhpcy5fbGFtYmRhU2VjdXJpdHlHcm91cF0sXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENyZWF0ZSBWUEMgRmxvdyBMb2dzIGZvciBzZWN1cml0eSBtb25pdG9yaW5nXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBjcmVhdGVGbG93TG9ncyhlbnZpcm9ubWVudDogc3RyaW5nKSB7XHJcbiAgICAvLyBDcmVhdGUgQ2xvdWRXYXRjaCBsb2cgZ3JvdXAgZm9yIFZQQyBmbG93IGxvZ3NcclxuICAgIGNvbnN0IGZsb3dMb2dHcm91cCA9IG5ldyBsb2dzLkxvZ0dyb3VwKHRoaXMsICdWcGNGbG93TG9nR3JvdXAnLCB7XHJcbiAgICAgIGxvZ0dyb3VwTmFtZTogYC9hd3MvdnBjL2Zsb3dsb2dzLyR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgcmV0ZW50aW9uOiBlbnZpcm9ubWVudCA9PT0gJ3Byb2R1Y3Rpb24nIFxyXG4gICAgICAgID8gbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9NT05USCBcclxuICAgICAgICA6IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfV0VFSyxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogZW52aXJvbm1lbnQgPT09ICdwcm9kdWN0aW9uJyBcclxuICAgICAgICA/IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTiBcclxuICAgICAgICA6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDcmVhdGUgSUFNIHJvbGUgZm9yIFZQQyBGbG93IExvZ3NcclxuICAgIGNvbnN0IGZsb3dMb2dSb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsICdWcGNGbG93TG9nUm9sZScsIHtcclxuICAgICAgcm9sZU5hbWU6IGBtaXNyYS1wbGF0Zm9ybS12cGMtZmxvdy1sb2ctcm9sZS0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCd2cGMtZmxvdy1sb2dzLmFtYXpvbmF3cy5jb20nKSxcclxuICAgICAgZGVzY3JpcHRpb246ICdJQU0gcm9sZSBmb3IgVlBDIEZsb3cgTG9ncycsXHJcbiAgICB9KTtcclxuXHJcbiAgICBmbG93TG9nUm9sZS5hZGRUb1BvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIHNpZDogJ0Nsb3VkV2F0Y2hMb2dzUGVybWlzc2lvbnMnLFxyXG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAnbG9nczpDcmVhdGVMb2dHcm91cCcsXHJcbiAgICAgICAgJ2xvZ3M6Q3JlYXRlTG9nU3RyZWFtJyxcclxuICAgICAgICAnbG9nczpQdXRMb2dFdmVudHMnLFxyXG4gICAgICAgICdsb2dzOkRlc2NyaWJlTG9nR3JvdXBzJyxcclxuICAgICAgICAnbG9nczpEZXNjcmliZUxvZ1N0cmVhbXMnLFxyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFtmbG93TG9nR3JvdXAubG9nR3JvdXBBcm5dLFxyXG4gICAgfSkpO1xyXG5cclxuICAgIC8vIENyZWF0ZSBWUEMgRmxvdyBMb2dzXHJcbiAgICBuZXcgZWMyLkZsb3dMb2codGhpcywgJ1ZwY0Zsb3dMb2cnLCB7XHJcbiAgICAgIGZsb3dMb2dOYW1lOiBgbWlzcmEtcGxhdGZvcm0tdnBjLWZsb3ctbG9nLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgcmVzb3VyY2VUeXBlOiBlYzIuRmxvd0xvZ1Jlc291cmNlVHlwZS5mcm9tVnBjKHRoaXMudnBjKSxcclxuICAgICAgZGVzdGluYXRpb246IGVjMi5GbG93TG9nRGVzdGluYXRpb24udG9DbG91ZFdhdGNoTG9ncyhmbG93TG9nR3JvdXAsIGZsb3dMb2dSb2xlKSxcclxuICAgICAgdHJhZmZpY1R5cGU6IGVjMi5GbG93TG9nVHJhZmZpY1R5cGUuQUxMLFxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBUYWcgYWxsIFZQQyByZXNvdXJjZXNcclxuICAgKi9cclxuICBwcml2YXRlIHRhZ1Jlc291cmNlcyhlbnZpcm9ubWVudDogc3RyaW5nKSB7XHJcbiAgICBjb25zdCB0YWdzID0ge1xyXG4gICAgICBFbnZpcm9ubWVudDogZW52aXJvbm1lbnQsXHJcbiAgICAgIFByb2plY3Q6ICdNSVNSQS1QbGF0Zm9ybScsXHJcbiAgICAgIENvbXBvbmVudDogJ1ZQQycsXHJcbiAgICAgIE1hbmFnZWRCeTogJ0NESycsXHJcbiAgICB9O1xyXG5cclxuICAgIE9iamVjdC5lbnRyaWVzKHRhZ3MpLmZvckVhY2goKFtrZXksIHZhbHVlXSkgPT4ge1xyXG4gICAgICBjZGsuVGFncy5vZih0aGlzLnZwYykuYWRkKGtleSwgdmFsdWUpO1xyXG4gICAgICBjZGsuVGFncy5vZih0aGlzLl9sYW1iZGFTZWN1cml0eUdyb3VwKS5hZGQoa2V5LCB2YWx1ZSk7XHJcbiAgICAgIGNkay5UYWdzLm9mKHRoaXMuX2RhdGFiYXNlU2VjdXJpdHlHcm91cCkuYWRkKGtleSwgdmFsdWUpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZXQgTGFtYmRhIFZQQyBjb25maWd1cmF0aW9uXHJcbiAgICovXHJcbiAgcHVibGljIGdldExhbWJkYVZwY0NvbmZpZygpOiB7XHJcbiAgICB2cGNJZDogc3RyaW5nO1xyXG4gICAgc3VibmV0SWRzOiBzdHJpbmdbXTtcclxuICAgIHNlY3VyaXR5R3JvdXBJZHM6IHN0cmluZ1tdO1xyXG4gIH0ge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgdnBjSWQ6IHRoaXMudnBjLnZwY0lkLFxyXG4gICAgICBzdWJuZXRJZHM6IHRoaXMucHJpdmF0ZVN1Ym5ldHMubWFwKHN1Ym5ldCA9PiBzdWJuZXQuc3VibmV0SWQpLFxyXG4gICAgICBzZWN1cml0eUdyb3VwSWRzOiBbdGhpcy5fbGFtYmRhU2VjdXJpdHlHcm91cC5zZWN1cml0eUdyb3VwSWRdLFxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENyZWF0ZSBvdXRwdXRzIGZvciByZWZlcmVuY2UgYnkgb3RoZXIgc3RhY2tzXHJcbiAgICovXHJcbiAgcHVibGljIGNyZWF0ZU91dHB1dHMoc2NvcGU6IENvbnN0cnVjdCwgc3RhY2tOYW1lOiBzdHJpbmcpIHtcclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHNjb3BlLCAnVnBjSWQnLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLnZwYy52cGNJZCxcclxuICAgICAgZGVzY3JpcHRpb246ICdWUEMgSUQnLFxyXG4gICAgICBleHBvcnROYW1lOiBgJHtzdGFja05hbWV9LVZwY0lkYCxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHNjb3BlLCAnUHJpdmF0ZVN1Ym5ldElkcycsIHtcclxuICAgICAgdmFsdWU6IHRoaXMucHJpdmF0ZVN1Ym5ldHMubWFwKHN1Ym5ldCA9PiBzdWJuZXQuc3VibmV0SWQpLmpvaW4oJywnKSxcclxuICAgICAgZGVzY3JpcHRpb246ICdQcml2YXRlIFN1Ym5ldCBJRHMnLFxyXG4gICAgICBleHBvcnROYW1lOiBgJHtzdGFja05hbWV9LVByaXZhdGVTdWJuZXRJZHNgLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQoc2NvcGUsICdQdWJsaWNTdWJuZXRJZHMnLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLnB1YmxpY1N1Ym5ldHMubWFwKHN1Ym5ldCA9PiBzdWJuZXQuc3VibmV0SWQpLmpvaW4oJywnKSxcclxuICAgICAgZGVzY3JpcHRpb246ICdQdWJsaWMgU3VibmV0IElEcycsXHJcbiAgICAgIGV4cG9ydE5hbWU6IGAke3N0YWNrTmFtZX0tUHVibGljU3VibmV0SWRzYCxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHNjb3BlLCAnTGFtYmRhU2VjdXJpdHlHcm91cElkJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy5fbGFtYmRhU2VjdXJpdHlHcm91cC5zZWN1cml0eUdyb3VwSWQsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnTGFtYmRhIFNlY3VyaXR5IEdyb3VwIElEJyxcclxuICAgICAgZXhwb3J0TmFtZTogYCR7c3RhY2tOYW1lfS1MYW1iZGFTZWN1cml0eUdyb3VwSWRgLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQoc2NvcGUsICdEYXRhYmFzZVNlY3VyaXR5R3JvdXBJZCcsIHtcclxuICAgICAgdmFsdWU6IHRoaXMuX2RhdGFiYXNlU2VjdXJpdHlHcm91cC5zZWN1cml0eUdyb3VwSWQsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnRGF0YWJhc2UgU2VjdXJpdHkgR3JvdXAgSUQnLFxyXG4gICAgICBleHBvcnROYW1lOiBgJHtzdGFja05hbWV9LURhdGFiYXNlU2VjdXJpdHlHcm91cElkYCxcclxuICAgIH0pO1xyXG4gIH1cclxufSJdfQ==