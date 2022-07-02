import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";

import * as path from "path";
import * as firehose from "@aws-cdk/aws-kinesisfirehose-alpha";
import * as kms from "aws-cdk-lib/aws-kms";
import * as lambdanodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cdk from "aws-cdk-lib";
import * as destinations from "@aws-cdk/aws-kinesisfirehose-destinations-alpha";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";

export class StreamingDataCollectionDemoStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const producerRole = new iam.Role(this, "ProduceFunctionRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
    });

    const producerFunction = new lambdanodejs.NodejsFunction(
      this,
      "ProducerFunction",
      {
        entry: path.join(__dirname, "lambda-producer.js"),
        timeout: cdk.Duration.minutes(15),
        bundling: {
          nodeModules: ["axios", "@aws-sdk/client-firehose"],
        },
        runtime: lambda.Runtime.NODEJS_16_X,
        role: producerRole,
      }
    );

    const bucket = new s3.Bucket(this, "Bucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      bucketName: "streaming-data-collection-demo-bucket",
    });

    const backupBucket = new s3.Bucket(this, "BackupBucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    const logGroup = new logs.LogGroup(this, "LogGroup", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const dataProcessorFunction = new lambdanodejs.NodejsFunction(
      this,
      "DataProcessorFunction",
      {
        entry: path.join(__dirname, "lambda-data-processor.js"),
        timeout: cdk.Duration.minutes(1),
      }
    );

    const processor = new firehose.LambdaFunctionProcessor(
      dataProcessorFunction,
      {
        bufferInterval: cdk.Duration.seconds(60),
        bufferSize: cdk.Size.mebibytes(1),
        retries: 1,
      }
    );

    const key = new kms.Key(this, "Key", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const backupKey = new kms.Key(this, "BackupKey", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const stream = new firehose.DeliveryStream(this, "Delivery Stream", {
      destinations: [
        new destinations.S3Bucket(bucket, {
          logging: true,
          logGroup: logGroup,
          processor: processor,
          dataOutputPrefix: "regularPrefix",
          errorOutputPrefix: "errorPrefix",
          bufferingInterval: cdk.Duration.seconds(60),
          bufferingSize: cdk.Size.mebibytes(1),
          encryptionKey: key,
          s3Backup: {
            mode: destinations.BackupMode.ALL,
            bucket: backupBucket,
            dataOutputPrefix: "backupPrefix",
            errorOutputPrefix: "backupErrorPrefix",
            bufferingInterval: cdk.Duration.seconds(60),
            bufferingSize: cdk.Size.mebibytes(1),
            encryptionKey: backupKey,
          },
        }),
      ],
    });

    producerFunction.addEnvironment(
      "DELIVERY_STREAM_NAME",
      stream.deliveryStreamName
    );

    stream.grantPutRecords(producerRole);
  }
}
