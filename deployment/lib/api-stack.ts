import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";
import * as certificatemanager from "aws-cdk-lib/aws-certificatemanager";
import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as ddb from "aws-cdk-lib/aws-dynamodb";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53targets from "aws-cdk-lib/aws-route53-targets";
import * as s3 from "aws-cdk-lib/aws-s3";
import { HttpMethods } from "aws-cdk-lib/aws-s3";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import * as wafv2 from "aws-cdk-lib/aws-wafv2";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";

/**
 * Format environment variables for use in a shell script
 */
const envFormat = (vars: { [key: string]: string | number }): string =>
  Object.entries(vars).map(([k, v]) => `${k}=${v}`)
    .join("\n");

export interface ApiStackProps extends cdk.StackProps {
  parameters: {
    ApiDomainName: string;
    ApplicationName: string;
    AwsRoute53CloudFrontHostedZoneId: string;
    Environment: string;
    FrontEndDomainName: string;
    GlobalCertificateArn: string;
    GlobalWafArn: string;
    HostedZoneName: string;
    IdentityProviderLogoutURL: string;
    LogBucketSuffix: string;
    RegionalCertificateArn: string;
    RegionalWafArn: string;
    SubnetIds: string[];
    SupportedIdentityProviders: string[];
    UserPoolStackName: string;
    VpcId: string;
  };
}

export class ApiStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const dataTable = new ddb.Table(this, "Table", {
      partitionKey: {
        name: "pk",
        type: ddb.AttributeType.STRING
      },
      sortKey: {
        name: "sk",
        type: ddb.AttributeType.STRING
      },
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: "ttl",
      stream: ddb.StreamViewType.NEW_AND_OLD_IMAGES,
      removalPolicy: cdk.RemovalPolicy.RETAIN
    });
    (dataTable.node.defaultChild! as ddb.CfnTable).overrideLogicalId("Table");

    const dataBucket = new s3.Bucket(this, "TranscriptionBucket", {
      bucketName: `${this.stackName}-${this.region}-${this.account}`.toLowerCase(),
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      cors: [
        {
          allowedMethods: [
            HttpMethods.HEAD,
            HttpMethods.GET,
            HttpMethods.PUT,
            HttpMethods.POST,
            HttpMethods.DELETE
          ],
          allowedOrigins: [
            "*"
          ],
          allowedHeaders: [
            "*"
          ],
          exposedHeaders: [
            "x-amz-server-side-encryption",
            "x-amz-request-id",
            "x-amz-id-2",
            "ETag"
          ]
        }
      ]
    });
    (dataBucket.node.defaultChild! as s3.CfnBucket).overrideLogicalId("TranscriptionBucket");

    const vpc = ec2.Vpc.fromLookup(this, "Vpc", { vpcId: props.parameters.VpcId });
    const apiSecurityGroup = new ec2.SecurityGroup(this, "ApiSecurityGroup", {
      description: `Security group for ${props.parameters.ApplicationName} api function`,
      vpc: vpc
    });

    const apiFunction = new NodejsFunction(this, "ApiFunction", {
      runtime: lambda.Runtime.NODEJS_18_X,
      description: "Serve the HTTP API",
      timeout: cdk.Duration.seconds(15),
      memorySize: 1024,
      entry: "../api/src/api/apiHandler.ts",
      handler: "handler",
      bundling: {
        minify: true,
        sourceMap: true,
        target: "es2020"
      },
      environment: {
        TABLE_NAME: dataTable.tableName,
        BUCKET_NAME: dataBucket.bucketName,
        APPLICATION_NAME: props.parameters.ApplicationName,
        ENVIRONMENT: props.parameters.Environment
      },
      vpc: vpc,
      securityGroups: [apiSecurityGroup],
      vpcSubnets: {
        subnets: props.parameters.SubnetIds.map(subnetId => ec2.Subnet.fromSubnetId(this, subnetId, subnetId))
      }
    });
    dataTable.grantReadWriteData(apiFunction);

    const userPoolArn = cdk.Fn.importValue(`${props.parameters.UserPoolStackName}-UserPoolArn`);
    const userPool = cognito.UserPool.fromUserPoolArn(this, "UserPool", userPoolArn);
    const auth = new apigateway.CognitoUserPoolsAuthorizer(this, "Authorizer", {
      cognitoUserPools: [userPool],
    });
    const apiCertificate = certificatemanager.Certificate.fromCertificateArn(this, "Certificate", props.parameters.RegionalCertificateArn);
    const api = new apigateway.RestApi(this, "Api", {
      domainName: {
        domainName: props.parameters.ApiDomainName,
        certificate: apiCertificate
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS,
        maxAge: cdk.Duration.days(10)
      },
    });
    const apiFunctionIntegration = new apigateway.LambdaIntegration(apiFunction);
    const apiResourceAuthorized = api.root.addResource("{proxy+}");
    apiResourceAuthorized.addMethod("ANY", apiFunctionIntegration, {
      authorizer: auth,
    });

    new wafv2.CfnWebACLAssociation(this, "ApiWebACLAssociation", {
      webAclArn: props.parameters.RegionalWafArn,
      resourceArn: api.deploymentStage.stageArn
    });

    const apiHostedZone = route53.HostedZone.fromLookup(this, "ApiHostedZone", {
      domainName: props.parameters.HostedZoneName,
      privateZone: false
    });

    const apiTarget = new route53targets.ApiGateway(api);

    new route53.ARecord(this, "ApiAliasRecord", {
      recordName: props.parameters.ApiDomainName,
      zone: apiHostedZone,
      target: route53.RecordTarget.fromAlias(apiTarget)
    });

    const jobStartFunction = new NodejsFunction(this, "TranscriptionJobStartFunction", {
      runtime: lambda.Runtime.NODEJS_18_X,
      description: "Starts transcription jobs when triggered by S3 events",
      timeout: cdk.Duration.seconds(15),
      memorySize: 1024,
      entry: "../api/src/event/fileUploadHandler.ts",
      handler: "handler",
      bundling: {
        minify: true,
        sourceMap: true,
        target: "es2020"
      },
      environment: {
        TABLE_NAME: dataTable.tableName,
        BUCKET_NAME: dataBucket.bucketName,
        APPLICATION_NAME: props.parameters.ApplicationName,
        ENVIRONMENT: props.parameters.Environment
      }
    });
    jobStartFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["transcribe:StartTranscriptionJob", "transcribe:GetTranscriptionJob"],
        resources: ["*"],
        effect: iam.Effect.ALLOW
      })
    );
    dataTable.grantReadWriteData(jobStartFunction);
    dataBucket.grantReadWrite(jobStartFunction);
    dataBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(jobStartFunction),
      { prefix: "private" },
      { suffix: ".upload" }
    );

    const jobStateChangeFunction = new NodejsFunction(this, "TranscriptionJobStateChangeFunction", {
      runtime: lambda.Runtime.NODEJS_18_X,
      description: "Updates transcription job state when triggered by S3 events",
      timeout: cdk.Duration.seconds(15),
      memorySize: 1024,
      entry: "../api/src/event/transcriptionJobStateChangeHandler.ts",
      handler: "handler",
      bundling: {
        minify: true,
        sourceMap: true,
        target: "es2020"
      },
      environment: {
        TABLE_NAME: dataTable.tableName,
        BUCKET_NAME: dataBucket.bucketName,
        APPLICATION_NAME: props.parameters.ApplicationName,
        ENVIRONMENT: props.parameters.Environment
      }
    });
    const jobStateChangeTarget = new targets.LambdaFunction(jobStateChangeFunction);
    const rule = new events.Rule(this, "TranscriptionJobStateChangeRule", {
      eventPattern: {
        source: [
          "aws.transcribe"
        ],
        detailType: [
          "Transcribe Job State Change"
        ],
        detail: {
          "TranscriptionJobStatus": [
            "COMPLETED",
            "FAILED"
          ]
        }
      }
    });
    rule.addTarget(jobStateChangeTarget);
    jobStateChangeFunction.addPermission("TranscriptionJobStateChangeFunctionPermission", {
      action: "lambda:InvokeFunction",
      principal: new iam.ServicePrincipal("events.amazonaws.com"),
      sourceArn: rule.ruleArn
    });
    dataTable.grantReadWriteData(jobStateChangeFunction);

    const copyOutputFunction = new NodejsFunction(this, "CopyOutputFunction", {
      runtime: lambda.Runtime.NODEJS_18_X,
      description: "Copies transcription job output to user's private folder",
      timeout: cdk.Duration.seconds(15),
      memorySize: 1024,
      entry: "../api/src/event/copyOutputHandler.ts",
      handler: "handler",
      bundling: {
        minify: true,
        sourceMap: true,
        target: "es2020"
      },
      environment: {
        TABLE_NAME: dataTable.tableName,
        BUCKET_NAME: dataBucket.bucketName,
        APPLICATION_NAME: props.parameters.ApplicationName,
        ENVIRONMENT: props.parameters.Environment
      }
    });
    copyOutputFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        "s3:GetObject",
        "s3:GetObjectTagging",
        "s3:GetObjectAcl",
        "s3:PutObject",
        "s3:PutObjectTagging",
        "s3:PutObjectAcl"
      ],
      resources: [
        `${dataBucket.bucketArn}/*`
      ],
      effect: iam.Effect.ALLOW
    }));
    dataTable.grantReadWriteData(copyOutputFunction);
    dataBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(copyOutputFunction),
      { prefix: "transcription" },
      { suffix: ".json" }
    );

    const userPoolClient = userPool.addClient("UserPoolClient", {
      supportedIdentityProviders: props.parameters.SupportedIdentityProviders.map(provider => cognito.UserPoolClientIdentityProvider.custom(provider)),
      oAuth: {
        callbackUrls: [
          "http://localhost:3000/",
          `https://${props.parameters.FrontEndDomainName}/`
        ],
        logoutUrls: [
          "http://localhost:3000/",
          `https://${props.parameters.FrontEndDomainName}/`
        ]
      }
    });
    (userPoolClient.node.defaultChild as cognito.CfnUserPoolClient).explicitAuthFlows = [
      "ALLOW_REFRESH_TOKEN_AUTH"
    ];

    const providerName = cdk.Fn.importValue(`${props.parameters.UserPoolStackName}-UserPoolProviderName`);
    const identityPool = new cognito.CfnIdentityPool(this, "IdentityPool", {
      allowUnauthenticatedIdentities: true,
      cognitoIdentityProviders: [
        {
          clientId: userPoolClient.userPoolClientId,
          providerName: providerName
        }
      ]
    });

    const amplifyAuthorizedRole = new iam.Role(this, "AuthorizedRole", {
      assumedBy: new iam.FederatedPrincipal("cognito-identity.amazonaws.com", {
        "StringEquals": {
          "cognito-identity.amazonaws.com:aud": identityPool.ref
        },
        "ForAnyValue:StringLike": {
          "cognito-identity.amazonaws.com:amr": "authenticated"
        }
      }, "sts:AssumeRoleWithWebIdentity"),
      inlinePolicies: {
        "cognito-authorized-policy": new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: [
                "cognito-identity:*"
              ],
              resources: ["*"]
            }),
            new iam.PolicyStatement({
              actions: [
                "lambda:InvokeFunction"
              ],
              resources: ["*"]
              // resources: [apiFunction.functionArn],
            })
          ]
        }),
        "s3-authorized-policy": new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: [
                "s3:ListBucket"
              ],
              resources: [dataBucket.bucketArn],
              conditions: {
                "StringLike": {
                  "s3:prefix": [
                    "private/${cognito-identity.amazonaws.com:sub}/",
                    "private/${cognito-identity.amazonaws.com:sub}/*"
                  ]
                }
              }
            }),
            new iam.PolicyStatement({
              actions: [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject"
              ],
              resources: [`${dataBucket.bucketArn}/private/\${cognito-identity.amazonaws.com:sub}/*`]
            })
          ]
        })
      }
    });

    const amplifyUnAuthorizedRole = new iam.Role(this, "UnAuthorizedRole", {
      assumedBy: new iam.FederatedPrincipal("cognito-identity.amazonaws.com", {
        "StringEquals": {
          "cognito-identity.amazonaws.com:aud": identityPool.ref
        },
        "ForAnyValue:StringLike": {
          "cognito-identity.amazonaws.com:amr": "unauthenticated"
        }
      })
    });

    new cognito.CfnIdentityPoolRoleAttachment(this, "IdentityPoolRoleAttachment", {
      identityPoolId: identityPool.ref,
      roles: {
        "authenticated": amplifyAuthorizedRole.roleArn,
        "unauthenticated": amplifyUnAuthorizedRole.roleArn
      }
    });

    new cdk.CfnOutput(this, "FrontEndEnvironment", {
      description: "The environment variables to build the front end",
      value: envFormat({
        NEXT_PUBLIC_ENV: props.parameters.Environment,
        NEXT_PUBLIC_APPLICATION_NAME: props.parameters.ApplicationName,
        NEXT_PUBLIC_API_ENDPOINT: `https://${props.parameters.ApiDomainName}`,
        NEXT_PUBLIC_AUTH_IDENTITY_POOL_ID: identityPool.ref,
        NEXT_PUBLIC_AUTH_USER_POOL_ID: userPool.userPoolId,
        NEXT_PUBLIC_AUTH_USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
        NEXT_PUBLIC_AUTH_SIGN_IN_REDIRECT: `https://${props.parameters.FrontEndDomainName}/`,
        NEXT_PUBLIC_AUTH_SIGN_OUT_REDIRECT: `https://${props.parameters.FrontEndDomainName}/`,
        NEXT_PUBLIC_AUTH_DOMAIN: cdk.Fn.importValue(`${props.parameters.UserPoolStackName}-DomainName`),
        NEXT_PUBLIC_TRANSCRIPTION_BUCKET: dataBucket.bucketName
      })
    });
  }
}
