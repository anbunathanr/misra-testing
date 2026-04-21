/**
 * VPC Configuration for Production Lambda Functions
 * Provides secure network isolation and configuration for Lambda functions
 */
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
export interface VpcConfigProps {
    environment: 'dev' | 'staging' | 'production';
    enableNatGateway: boolean;
    enableVpcEndpoints: boolean;
    cidrBlock?: string;
}
export declare class VpcConfig extends Construct {
    readonly vpc: ec2.Vpc;
    private _lambdaSecurityGroup;
    private _databaseSecurityGroup;
    readonly privateSubnets: ec2.ISubnet[];
    readonly publicSubnets: ec2.ISubnet[];
    get lambdaSecurityGroup(): ec2.SecurityGroup;
    get databaseSecurityGroup(): ec2.SecurityGroup;
    constructor(scope: Construct, id: string, props: VpcConfigProps);
    /**
     * Create security groups for different tiers
     */
    private createSecurityGroups;
    /**
     * Create VPC endpoints for AWS services to avoid internet traffic
     */
    private createVpcEndpoints;
    /**
     * Create VPC Flow Logs for security monitoring
     */
    private createFlowLogs;
    /**
     * Tag all VPC resources
     */
    private tagResources;
    /**
     * Get Lambda VPC configuration
     */
    getLambdaVpcConfig(): {
        vpcId: string;
        subnetIds: string[];
        securityGroupIds: string[];
    };
    /**
     * Create outputs for reference by other stacks
     */
    createOutputs(scope: Construct, stackName: string): void;
}
