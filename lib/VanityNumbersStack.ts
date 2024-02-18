import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export class VanityNumbersStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create S3 bucket that will contain list of 4 letter words used to check againt letter combos for customer phone number
    const vanityBucket = new s3.Bucket(this, 'VanityBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    })

    // Add four-letter.txt file from resources directory to S3 bucket
    new s3deploy.BucketDeployment(this, 'addTxtFile', {
      sources: [s3deploy.Source.asset(path.resolve(__dirname,'../resources'))],
      destinationBucket: vanityBucket
    })

    // Create DynamoDB table that will store the customer phone number and 5 corresponding vanity number options
    const vanityTable = new dynamodb.Table(this, 'VanityTable', {
      partitionKey: { 
        name: 'phoneNumber', 
        type: dynamodb.AttributeType.STRING 
      },
    })

    // Create lambda that will handle vanity number creation and storage
    const createVanityLambda = new NodejsFunction(this, 'createVanity', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.resolve(__dirname, '../lambda/createVanity.ts'),
      handler: 'handler',
      environment: {
        BUCKET_NAME: vanityBucket.bucketName,
        TABLE_NAME: vanityTable.tableName
      }
    })

    //Grant lambda read acess to S3 bucket and read/write access to dynamo
    vanityBucket.grantRead(createVanityLambda);
    vanityTable.grantReadWriteData(createVanityLambda);
 }
}
