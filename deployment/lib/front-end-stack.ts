import * as cdk from "aws-cdk-lib";
import * as certificatemanager from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53targets from "aws-cdk-lib/aws-route53-targets";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deployment from "aws-cdk-lib/aws-s3-deployment";

export interface FrontendStackProps extends cdk.StackProps {
  parameters: {
    readonly FrontEndDomainName: string;
    readonly HostedZoneName: string;
    readonly GlobalWafArn: string;
    readonly GlobalCertificateArn: string;
  };
}

export class FrontEndStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props: FrontendStackProps) {
    super(scope, id, props);
    const parameters = props.parameters;

    const distributionHostedZone = route53.HostedZone.fromLookup(this, "distribution-hosted-zone", {
      domainName: parameters.HostedZoneName,
      privateZone: false
    });

    const distributionBucket = new s3.Bucket(this, "distribution-bucket", {
      autoDeleteObjects: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, "distribution-bucket-oai");
    distributionBucket.grantRead(originAccessIdentity);

    const edgeLambda = new cloudfront.experimental.EdgeFunction(this, "edge-lambda", {
      runtime: lambda.Runtime.NODEJS_18_X,
      description: "Edge Lambda",
      timeout: cdk.Duration.seconds(5),
      memorySize: 128,
      code: lambda.Code.fromAsset("../serve/src"),
      handler: "index.handler"
    });

    const distribution = new cloudfront.Distribution(this, "distribution", {
      domainNames: [parameters.FrontEndDomainName],
      certificate: certificatemanager.Certificate.fromCertificateArn(this, "distribution-certificate", parameters.GlobalCertificateArn),
      defaultBehavior: {
        origin: new origins.S3Origin(distributionBucket, { originAccessIdentity }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        edgeLambdas: [{
          functionVersion: edgeLambda.currentVersion,
          eventType: cloudfront.LambdaEdgeEventType.VIEWER_REQUEST
        }]
      },
      webAclId: parameters.GlobalWafArn
    });

    const cloudFrontTarget = new route53targets.CloudFrontTarget(distribution);
    new route53.ARecord(this, "distribution-alias-record", {
      recordName: parameters.FrontEndDomainName,
      zone: distributionHostedZone,
      target: route53.RecordTarget.fromAlias(cloudFrontTarget)
    });

    new s3deployment.BucketDeployment(this, "distribution-deployment", {
      sources: [s3deployment.Source.asset("../frontend/out")],
      destinationBucket: distributionBucket,
      distribution
    });
  }
}