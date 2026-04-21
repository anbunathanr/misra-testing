"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SampleFilesTable = void 0;
const aws_dynamodb_1 = require("aws-cdk-lib/aws-dynamodb");
const constructs_1 = require("constructs");
const aws_cdk_lib_1 = require("aws-cdk-lib");
class SampleFilesTable extends constructs_1.Construct {
    table;
    constructor(scope, id) {
        super(scope, id);
        this.table = new aws_dynamodb_1.Table(this, 'SampleFilesTable', {
            tableName: 'SampleFiles',
            partitionKey: {
                name: 'sample_id',
                type: aws_dynamodb_1.AttributeType.STRING,
            },
            billingMode: aws_dynamodb_1.BillingMode.PAY_PER_REQUEST,
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.RETAIN,
            pointInTimeRecovery: true,
            encryption: aws_dynamodb_1.TableEncryption.AWS_MANAGED,
        });
        // Global Secondary Index for querying by language
        this.table.addGlobalSecondaryIndex({
            indexName: 'LanguageIndex',
            partitionKey: {
                name: 'language',
                type: aws_dynamodb_1.AttributeType.STRING,
            },
            sortKey: {
                name: 'difficulty_level',
                type: aws_dynamodb_1.AttributeType.STRING,
            },
        });
        // Global Secondary Index for querying by difficulty level
        this.table.addGlobalSecondaryIndex({
            indexName: 'DifficultyIndex',
            partitionKey: {
                name: 'difficulty_level',
                type: aws_dynamodb_1.AttributeType.STRING,
            },
            sortKey: {
                name: 'expected_violations',
                type: aws_dynamodb_1.AttributeType.NUMBER,
            },
        });
    }
}
exports.SampleFilesTable = SampleFilesTable;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2FtcGxlLWZpbGVzLXRhYmxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2FtcGxlLWZpbGVzLXRhYmxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDJEQUE4RjtBQUM5RiwyQ0FBdUM7QUFDdkMsNkNBQTRDO0FBRTVDLE1BQWEsZ0JBQWlCLFNBQVEsc0JBQVM7SUFDN0IsS0FBSyxDQUFRO0lBRTdCLFlBQVksS0FBZ0IsRUFBRSxFQUFVO1FBQ3RDLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLG9CQUFLLENBQUMsSUFBSSxFQUFFLGtCQUFrQixFQUFFO1lBQy9DLFNBQVMsRUFBRSxhQUFhO1lBQ3hCLFlBQVksRUFBRTtnQkFDWixJQUFJLEVBQUUsV0FBVztnQkFDakIsSUFBSSxFQUFFLDRCQUFhLENBQUMsTUFBTTthQUMzQjtZQUNELFdBQVcsRUFBRSwwQkFBVyxDQUFDLGVBQWU7WUFDeEMsYUFBYSxFQUFFLDJCQUFhLENBQUMsTUFBTTtZQUNuQyxtQkFBbUIsRUFBRSxJQUFJO1lBQ3pCLFVBQVUsRUFBRSw4QkFBZSxDQUFDLFdBQVc7U0FDeEMsQ0FBQyxDQUFDO1FBRUgsa0RBQWtEO1FBQ2xELElBQUksQ0FBQyxLQUFLLENBQUMsdUJBQXVCLENBQUM7WUFDakMsU0FBUyxFQUFFLGVBQWU7WUFDMUIsWUFBWSxFQUFFO2dCQUNaLElBQUksRUFBRSxVQUFVO2dCQUNoQixJQUFJLEVBQUUsNEJBQWEsQ0FBQyxNQUFNO2FBQzNCO1lBQ0QsT0FBTyxFQUFFO2dCQUNQLElBQUksRUFBRSxrQkFBa0I7Z0JBQ3hCLElBQUksRUFBRSw0QkFBYSxDQUFDLE1BQU07YUFDM0I7U0FDRixDQUFDLENBQUM7UUFFSCwwREFBMEQ7UUFDMUQsSUFBSSxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQztZQUNqQyxTQUFTLEVBQUUsaUJBQWlCO1lBQzVCLFlBQVksRUFBRTtnQkFDWixJQUFJLEVBQUUsa0JBQWtCO2dCQUN4QixJQUFJLEVBQUUsNEJBQWEsQ0FBQyxNQUFNO2FBQzNCO1lBQ0QsT0FBTyxFQUFFO2dCQUNQLElBQUksRUFBRSxxQkFBcUI7Z0JBQzNCLElBQUksRUFBRSw0QkFBYSxDQUFDLE1BQU07YUFDM0I7U0FDRixDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUE1Q0QsNENBNENDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVGFibGUsIEF0dHJpYnV0ZVR5cGUsIEJpbGxpbmdNb2RlLCBUYWJsZUVuY3J5cHRpb24gfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInO1xyXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcclxuaW1wb3J0IHsgUmVtb3ZhbFBvbGljeSB9IGZyb20gJ2F3cy1jZGstbGliJztcclxuXHJcbmV4cG9ydCBjbGFzcyBTYW1wbGVGaWxlc1RhYmxlIGV4dGVuZHMgQ29uc3RydWN0IHtcclxuICBwdWJsaWMgcmVhZG9ubHkgdGFibGU6IFRhYmxlO1xyXG5cclxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nKSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQpO1xyXG5cclxuICAgIHRoaXMudGFibGUgPSBuZXcgVGFibGUodGhpcywgJ1NhbXBsZUZpbGVzVGFibGUnLCB7XHJcbiAgICAgIHRhYmxlTmFtZTogJ1NhbXBsZUZpbGVzJyxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7XHJcbiAgICAgICAgbmFtZTogJ3NhbXBsZV9pZCcsXHJcbiAgICAgICAgdHlwZTogQXR0cmlidXRlVHlwZS5TVFJJTkcsXHJcbiAgICAgIH0sXHJcbiAgICAgIGJpbGxpbmdNb2RlOiBCaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IFJlbW92YWxQb2xpY3kuUkVUQUlOLFxyXG4gICAgICBwb2ludEluVGltZVJlY292ZXJ5OiB0cnVlLFxyXG4gICAgICBlbmNyeXB0aW9uOiBUYWJsZUVuY3J5cHRpb24uQVdTX01BTkFHRUQsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHbG9iYWwgU2Vjb25kYXJ5IEluZGV4IGZvciBxdWVyeWluZyBieSBsYW5ndWFnZVxyXG4gICAgdGhpcy50YWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XHJcbiAgICAgIGluZGV4TmFtZTogJ0xhbmd1YWdlSW5kZXgnLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHtcclxuICAgICAgICBuYW1lOiAnbGFuZ3VhZ2UnLFxyXG4gICAgICAgIHR5cGU6IEF0dHJpYnV0ZVR5cGUuU1RSSU5HLFxyXG4gICAgICB9LFxyXG4gICAgICBzb3J0S2V5OiB7XHJcbiAgICAgICAgbmFtZTogJ2RpZmZpY3VsdHlfbGV2ZWwnLFxyXG4gICAgICAgIHR5cGU6IEF0dHJpYnV0ZVR5cGUuU1RSSU5HLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gR2xvYmFsIFNlY29uZGFyeSBJbmRleCBmb3IgcXVlcnlpbmcgYnkgZGlmZmljdWx0eSBsZXZlbFxyXG4gICAgdGhpcy50YWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XHJcbiAgICAgIGluZGV4TmFtZTogJ0RpZmZpY3VsdHlJbmRleCcsXHJcbiAgICAgIHBhcnRpdGlvbktleToge1xyXG4gICAgICAgIG5hbWU6ICdkaWZmaWN1bHR5X2xldmVsJyxcclxuICAgICAgICB0eXBlOiBBdHRyaWJ1dGVUeXBlLlNUUklORyxcclxuICAgICAgfSxcclxuICAgICAgc29ydEtleToge1xyXG4gICAgICAgIG5hbWU6ICdleHBlY3RlZF92aW9sYXRpb25zJyxcclxuICAgICAgICB0eXBlOiBBdHRyaWJ1dGVUeXBlLk5VTUJFUixcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG4gIH1cclxufSJdfQ==