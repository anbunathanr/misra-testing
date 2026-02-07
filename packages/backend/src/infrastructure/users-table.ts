/**
 * AWS CDK infrastructure definition for Users DynamoDB table
 */

import { Construct } from 'constructs'
import { Table, AttributeType, BillingMode, ProjectionType } from 'aws-cdk-lib/aws-dynamodb'
import { RemovalPolicy } from 'aws-cdk-lib'

export class UsersTable extends Construct {
  public readonly table: Table

  constructor(scope: Construct, id: string, props?: { environment?: string }) {
    super(scope, id)

    const environment = props?.environment || 'dev'
    const tableName = `Users-${environment}`

    this.table = new Table(this, 'UsersTable', {
      tableName,
      partitionKey: {
        name: 'userId',
        type: AttributeType.STRING
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: environment === 'prod' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      pointInTimeRecovery: environment === 'prod',
    })

    // Add Global Secondary Indexes
    this.table.addGlobalSecondaryIndex({
      indexName: 'email-index',
      partitionKey: {
        name: 'email',
        type: AttributeType.STRING
      },
      projectionType: ProjectionType.ALL
    })

    this.table.addGlobalSecondaryIndex({
      indexName: 'organizationId-index',
      partitionKey: {
        name: 'organizationId',
        type: AttributeType.STRING
      },
      sortKey: {
        name: 'createdAt',
        type: AttributeType.NUMBER
      },
      projectionType: ProjectionType.ALL
    })

    this.table.addGlobalSecondaryIndex({
      indexName: 'role-index',
      partitionKey: {
        name: 'role',
        type: AttributeType.STRING
      },
      sortKey: {
        name: 'lastLoginAt',
        type: AttributeType.NUMBER
      },
      projectionType: ProjectionType.ALL
    })

    this.table.node.addMetadata('Purpose', 'User profiles and authentication data')
    this.table.node.addMetadata('Environment', environment)
  }

  public grantReadData(grantee: any) {
    return this.table.grantReadData(grantee)
  }

  public grantWriteData(grantee: any) {
    return this.table.grantWriteData(grantee)
  }

  public grantFullAccess(grantee: any) {
    return this.table.grantFullAccess(grantee)
  }
}
