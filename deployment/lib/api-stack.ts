import * as cdk from "aws-cdk-lib";
import { Duration } from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as certificatemanager from "aws-cdk-lib/aws-certificatemanager";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as ddb from "aws-cdk-lib/aws-dynamodb";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53targets from "aws-cdk-lib/aws-route53-targets";
import * as s3 from "aws-cdk-lib/aws-s3";
import { HttpMethods } from "aws-cdk-lib/aws-s3";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import * as wafv2 from "aws-cdk-lib/aws-wafv2";
import type { IConstruct } from "constructs";

/**
 * Handlers wrap their AWS clients with `xray.captureAWSv3Client` at module
 * load, which throws when no X-Ray daemon is listening. `api` already uses the
 * same escape hatch to run its tests.
 */
class TolerateMissingXrayDaemon implements cdk.IAspect {
  visit(node: IConstruct): void {
    if (node instanceof lambda.Function) {
      node.addEnvironment("AWS_XRAY_CONTEXT_MISSING", "LOG_ERROR");
    }
  }
}

/**
 * REST API id pinned under a local deploy, so the emulator's execute-api URL
 * does not change every time the stack is rebuilt. Must be unique within the
 * local account.
 */
const LOCAL_REST_API_ID = "transcription";

/**
 * Format environment variables for use in a shell script
 */
const envFormat = (vars: { [key: string]: string | number }): string =>
  Object.entries(vars)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

export interface ApiStackProps extends cdk.StackProps {
  parameters: {
    ApiAliasRecordName?: string;
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
    SplunkRumAccessToken?: string;
    SubnetIds: string[];
    SupportedIdentityProviders: string[];
    UmamiWebsiteId?: string;
    UmamiUrl?: string;
    UserPoolStackName: string;
    VpcId: string;
  };
  /**
   * Set only when deploying against a local emulator rather than real AWS,
   * carrying the browser-reachable address of the emulator gateway. Every
   * concession the emulator requires is derived from this in one block at the
   * top of the stack constructor; resources that simply have no local
   * counterpart are driven by their own parameter being empty instead.
   */
  emulator?: { endpoint: string };
}

export class ApiStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const emulator = props.emulator;

    // Everything that differs when the target is a local emulator rather than
    // AWS, collected here so the rest of the stack reads AWS-first. Only the
    // three cases that cannot be expressed as a value are branched on below:
    // the X-Ray aspect, the REST API id tag, and the API endpoint, which needs
    // the API to exist first.

    // The SDK addresses S3 virtual-host style by default, so a handler resolves
    // <bucket>.<endpoint-host>. A local emulator has no wildcard DNS entry for
    // that, so handlers force path-style addressing instead. See
    // api/src/client/s3Client.ts.
    const localHandlerEnvironment: Record<string, string> = emulator
      ? { S3_FORCE_PATH_STYLE: "true" }
      : {};

    // The emulator does not model integration responses, so the mock OPTIONS
    // integration these options generate answers a preflight with no CORS
    // headers and the browser blocks every call. Leaving them off there lets
    // OPTIONS reach the proxy integration, where the API's own `cors()`
    // middleware answers it.
    const corsPreflightOptions = emulator
      ? undefined
      : {
          allowOrigins: apigateway.Cors.ALL_ORIGINS,
          allowMethods: apigateway.Cors.ALL_METHODS,
          allowHeaders: apigateway.Cors.DEFAULT_HEADERS,
          maxAge: cdk.Duration.days(10),
        };

    // The hosted UI needs TLS, which the local emulator does not serve, so a
    // local deploy signs in with a username and password instead.
    const explicitAuthFlows = emulator
      ? ["ALLOW_REFRESH_TOKEN_AUTH", "ALLOW_USER_PASSWORD_AUTH"]
      : ["ALLOW_REFRESH_TOKEN_AUTH"];

    // Real deployments are fronted by a custom domain over TLS. The emulator
    // has no domain or certificate, so the frontend is served by `next dev`
    // over http.
    const frontEndScheme = emulator ? "http" : "https";

    // The AWS SDK talks to the real AWS endpoints unless it is told otherwise,
    // which a local deploy has to override to reach the emulator.
    const emulatorFrontEndEnvironment: Record<string, string> = emulator
      ? { NEXT_PUBLIC_AWS_ENDPOINT: emulator.endpoint }
      : {};

    if (emulator) {
      cdk.Aspects.of(this).add(new TolerateMissingXrayDaemon());
    }

    const dataTable = new ddb.Table(this, "Table", {
      partitionKey: {
        name: "pk",
        type: ddb.AttributeType.STRING,
      },
      sortKey: {
        name: "sk",
        type: ddb.AttributeType.STRING,
      },
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: "ttl",
      stream: ddb.StreamViewType.NEW_AND_OLD_IMAGES,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    (dataTable.node.defaultChild! as ddb.CfnTable).overrideLogicalId("Table");

    const dataBucket = new s3.Bucket(this, "TranscriptionBucket", {
      bucketName:
        `${this.stackName}-${this.region}-${this.account}`.toLowerCase(),
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      cors: [
        {
          allowedMethods: [
            HttpMethods.HEAD,
            HttpMethods.GET,
            HttpMethods.PUT,
            HttpMethods.POST,
            HttpMethods.DELETE,
          ],
          allowedOrigins: ["*"],
          allowedHeaders: ["*"],
          exposedHeaders: [
            "x-amz-server-side-encryption",
            "x-amz-request-id",
            "x-amz-id-2",
            "ETag",
          ],
        },
      ],
    });
    (dataBucket.node.defaultChild! as s3.CfnBucket).overrideLogicalId(
      "TranscriptionBucket",
    );
    dataBucket.addLifecycleRule({
      enabled: true,
      expiration: Duration.days(14),
    });

    // Vpc.fromLookup is a context lookup that hits real AWS at synth time and
    // ignores AWS_ENDPOINT_URL. An environment with no VpcId runs the handlers
    // outside a VPC, which is what a local deploy does.
    const vpcConfiguration = props.parameters.VpcId
      ? (() => {
          const vpc = ec2.Vpc.fromLookup(this, "Vpc", {
            vpcId: props.parameters.VpcId,
          });
          return {
            vpc,
            securityGroups: [
              new ec2.SecurityGroup(this, "ApiSecurityGroup", {
                description: `Security group for ${props.parameters.ApplicationName} api function`,
                vpc: vpc,
              }),
            ],
            vpcSubnets: {
              subnets: props.parameters.SubnetIds.map((subnetId) =>
                ec2.Subnet.fromSubnetId(this, subnetId, subnetId),
              ),
            },
          };
        })()
      : {};

    const apiFunction = new NodejsFunction(this, "ApiFunction", {
      runtime: lambda.Runtime.NODEJS_24_X,
      description: "Serve the HTTP API",
      timeout: cdk.Duration.seconds(15),
      memorySize: 1024,
      entry: "../api/src/api/apiHandler.ts",
      handler: "handler",
      bundling: {
        minify: true,
        sourceMap: true,
        target: "es2020",
      },
      environment: {
        TABLE_NAME: dataTable.tableName,
        BUCKET_NAME: dataBucket.bucketName,
        APPLICATION_NAME: props.parameters.ApplicationName,
        ENVIRONMENT: props.parameters.Environment,
        ...localHandlerEnvironment,
      },
      ...vpcConfiguration,
    });
    dataTable.grantReadWriteData(apiFunction);

    const userPoolArn = cdk.Fn.importValue(
      `${props.parameters.UserPoolStackName}-UserPoolArn`,
    );
    const userPool = cognito.UserPool.fromUserPoolArn(
      this,
      "UserPool",
      userPoolArn,
    );
    const auth = new apigateway.CognitoUserPoolsAuthorizer(this, "Authorizer", {
      cognitoUserPools: [userPool],
    });
    // An environment with no ApiDomainName is reached on the API's own endpoint
    // rather than through a custom domain, which is what a local deploy does.
    const domainConfiguration = props.parameters.ApiDomainName
      ? {
          domainName: {
            domainName: props.parameters.ApiDomainName,
            certificate: certificatemanager.Certificate.fromCertificateArn(
              this,
              "Certificate",
              props.parameters.RegionalCertificateArn,
            ),
          },
        }
      : {};
    const api = new apigateway.RestApi(this, "Api", {
      ...domainConfiguration,
      defaultCorsPreflightOptions: corsPreflightOptions,
    });

    // MiniStack assigns a random REST API id on every deploy, which changes the
    // execute-api URL the local frontend is built against. The ms-custom-id tag
    // pins it so frontend/.env.local stays valid across a rebuilt stack. Real
    // deployments have no such tag, and AWS would just carry it as metadata.
    if (emulator) {
      cdk.Tags.of(api).add("ms-custom-id", LOCAL_REST_API_ID);
    }
    const apiFunctionIntegration = new apigateway.LambdaIntegration(
      apiFunction,
    );
    const apiResourceAuthorized = api.root.addResource("{proxy+}");
    apiResourceAuthorized.addMethod("ANY", apiFunctionIntegration, {
      authorizer: auth,
    });

    if (props.parameters.RegionalWafArn) {
      new wafv2.CfnWebACLAssociation(this, "ApiWebACLAssociation", {
        webAclArn: props.parameters.RegionalWafArn,
        resourceArn: api.deploymentStage.stageArn,
      });
    }

    // HostedZone.fromLookup is a context lookup that hits real AWS at synth
    // time and ignores AWS_ENDPOINT_URL. An environment with no HostedZoneName
    // publishes no alias record, which is what a local deploy does.
    if (props.parameters.HostedZoneName) {
      const apiHostedZone = route53.HostedZone.fromLookup(
        this,
        "ApiHostedZone",
        {
          domainName: props.parameters.HostedZoneName,
          privateZone: false,
        },
      );

      const apiTarget = new route53targets.ApiGateway(api);

      new route53.ARecord(this, "ApiAliasRecord", {
        recordName:
          props.parameters.ApiAliasRecordName ?? props.parameters.ApiDomainName,
        zone: apiHostedZone,
        target: route53.RecordTarget.fromAlias(apiTarget),
      });
    }

    const jobStartFunction = new NodejsFunction(
      this,
      "TranscriptionJobStartFunction",
      {
        runtime: lambda.Runtime.NODEJS_24_X,
        description: "Starts transcription jobs when triggered by S3 events",
        timeout: cdk.Duration.seconds(15),
        memorySize: 1024,
        entry: "../api/src/event/fileUploadHandler.ts",
        handler: "handler",
        bundling: {
          minify: true,
          sourceMap: true,
          target: "es2020",
        },
        environment: {
          TABLE_NAME: dataTable.tableName,
          BUCKET_NAME: dataBucket.bucketName,
          APPLICATION_NAME: props.parameters.ApplicationName,
          ENVIRONMENT: props.parameters.Environment,
          ...localHandlerEnvironment,
        },
      },
    );
    jobStartFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "transcribe:StartTranscriptionJob",
          "transcribe:GetTranscriptionJob",
        ],
        resources: ["*"],
        effect: iam.Effect.ALLOW,
      }),
    );
    dataTable.grantReadWriteData(jobStartFunction);
    dataBucket.grantReadWrite(jobStartFunction);
    dataBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(jobStartFunction),
      { prefix: "users/" },
      { suffix: ".upload" },
    );

    const jobStateChangeFunction = new NodejsFunction(
      this,
      "TranscriptionJobStateChangeFunction",
      {
        runtime: lambda.Runtime.NODEJS_24_X,
        description:
          "Updates transcription job state when triggered by S3 events",
        timeout: cdk.Duration.seconds(15),
        memorySize: 1024,
        entry: "../api/src/event/transcriptionJobStateChangeHandler.ts",
        handler: "handler",
        bundling: {
          minify: true,
          sourceMap: true,
          target: "es2020",
        },
        environment: {
          TABLE_NAME: dataTable.tableName,
          BUCKET_NAME: dataBucket.bucketName,
          APPLICATION_NAME: props.parameters.ApplicationName,
          ENVIRONMENT: props.parameters.Environment,
          ...localHandlerEnvironment,
        },
      },
    );
    const jobStateChangeTarget = new targets.LambdaFunction(
      jobStateChangeFunction,
    );
    const rule = new events.Rule(this, "TranscriptionJobStateChangeRule", {
      eventPattern: {
        source: ["aws.transcribe"],
        detailType: ["Transcribe Job State Change"],
        detail: {
          TranscriptionJobStatus: ["COMPLETED", "FAILED"],
        },
      },
    });
    rule.addTarget(jobStateChangeTarget);
    jobStateChangeFunction.addPermission(
      "TranscriptionJobStateChangeFunctionPermission",
      {
        action: "lambda:InvokeFunction",
        principal: new iam.ServicePrincipal("events.amazonaws.com"),
        sourceArn: rule.ruleArn,
      },
    );
    dataTable.grantReadWriteData(jobStateChangeFunction);

    const copyOutputFunction = new NodejsFunction(this, "CopyOutputFunction", {
      runtime: lambda.Runtime.NODEJS_24_X,
      description:
        "Copies transcription job output to the user's readable folder",
      timeout: cdk.Duration.seconds(15),
      memorySize: 1024,
      entry: "../api/src/event/copyOutputHandler.ts",
      handler: "handler",
      bundling: {
        minify: true,
        sourceMap: true,
        target: "es2020",
      },
      environment: {
        TABLE_NAME: dataTable.tableName,
        BUCKET_NAME: dataBucket.bucketName,
        APPLICATION_NAME: props.parameters.ApplicationName,
        ENVIRONMENT: props.parameters.Environment,
        ...localHandlerEnvironment,
      },
    });
    copyOutputFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "s3:GetObject",
          "s3:GetObjectTagging",
          "s3:GetObjectAcl",
          "s3:PutObject",
          "s3:PutObjectTagging",
          "s3:PutObjectAcl",
        ],
        resources: [`${dataBucket.bucketArn}/*`],
        effect: iam.Effect.ALLOW,
      }),
    );
    dataTable.grantReadWriteData(copyOutputFunction);
    dataBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(copyOutputFunction),
      { prefix: "transcription" },
      { suffix: ".json" },
    );

    const summariseTranscriptionFunction = new NodejsFunction(
      this,
      "SummariseTranscriptionFunction",
      {
        runtime: lambda.Runtime.NODEJS_24_X,
        description: "Generates a summary of the transcription output",
        timeout: cdk.Duration.minutes(5),
        memorySize: 1024,
        entry: "../api/src/event/summariseTranscriptionHandler.ts",
        handler: "handler",
        bundling: {
          minify: true,
          sourceMap: true,
          target: "es2020",
        },
        environment: {
          TABLE_NAME: dataTable.tableName,
          BUCKET_NAME: dataBucket.bucketName,
          APPLICATION_NAME: props.parameters.ApplicationName,
          ENVIRONMENT: props.parameters.Environment,
          ...localHandlerEnvironment,
        },
      },
    );

    summariseTranscriptionFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "s3:GetObject",
          "s3:GetObjectTagging",
          "s3:GetObjectAcl",
          "s3:PutObject",
          "s3:PutObjectTagging",
          "s3:PutObjectAcl",
        ],
        resources: [`${dataBucket.bucketArn}/*`],
        effect: iam.Effect.ALLOW,
      }),
    );
    summariseTranscriptionFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["bedrock:InvokeModel"],
        resources: [
          "arn:aws:bedrock:ap-southeast-2::foundation-model/anthropic.claude-3-haiku-20240307-v1:0",
        ],
      }),
    );
    dataTable.grantReadWriteData(summariseTranscriptionFunction);
    dataBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(summariseTranscriptionFunction),
      { prefix: "users/" },
      { suffix: ".json" },
    );

    // IAM role assumed by Amazon Translate to read batch input and write batch
    // output in the data bucket. Trust is scoped to this account/region to avoid
    // the confused-deputy problem.
    const translateDataAccessRole = new iam.Role(
      this,
      "TranslateDataAccessRole",
      {
        description:
          "Lets Amazon Translate read batch input and write batch output",
        assumedBy: new iam.ServicePrincipal("translate.amazonaws.com", {
          conditions: {
            StringEquals: { "aws:SourceAccount": this.account },
            ArnLike: {
              "aws:SourceArn": `arn:aws:translate:${this.region}:${this.account}:*`,
            },
          },
        }),
      },
    );
    translateDataAccessRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["s3:GetObject"],
        resources: [
          `${dataBucket.bucketArn}/translations/input/*`,
          `${dataBucket.bucketArn}/translations/output/*`,
        ],
      }),
    );
    translateDataAccessRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["s3:PutObject"],
        resources: [`${dataBucket.bucketArn}/translations/output/*`],
      }),
    );
    translateDataAccessRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["s3:ListBucket"],
        resources: [dataBucket.bucketArn],
        conditions: {
          StringLike: {
            "s3:prefix": ["translations/input/*", "translations/output/*"],
          },
        },
      }),
    );

    // Starts an Amazon Translate asynchronous batch job once a transcription
    // completes. Triggered off the same Transcribe "COMPLETED" event used to
    // update job state. EventBridge (rather than an S3 notification) is used
    // because the summarise function already owns the users/*.json
    // OBJECT_CREATED filter and S3 rejects overlapping notification configs.
    const translateStartFunction = new NodejsFunction(
      this,
      "TranslateStartFunction",
      {
        runtime: lambda.Runtime.NODEJS_24_X,
        description:
          "Starts an Amazon Translate batch job for completed transcriptions",
        timeout: cdk.Duration.minutes(5),
        memorySize: 1024,
        entry: "../api/src/event/translateStartHandler.ts",
        handler: "handler",
        bundling: {
          minify: true,
          sourceMap: true,
          target: "es2020",
        },
        environment: {
          TABLE_NAME: dataTable.tableName,
          BUCKET_NAME: dataBucket.bucketName,
          APPLICATION_NAME: props.parameters.ApplicationName,
          ENVIRONMENT: props.parameters.Environment,
          ...localHandlerEnvironment,
          TRANSLATE_DATA_ACCESS_ROLE_ARN: translateDataAccessRole.roleArn,
        },
      },
    );
    translateStartFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["translate:StartTextTranslationJob"],
        resources: ["*"],
        effect: iam.Effect.ALLOW,
      }),
    );
    translateStartFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["transcribe:GetTranscriptionJob"],
        resources: ["*"],
        effect: iam.Effect.ALLOW,
      }),
    );
    translateStartFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["iam:PassRole"],
        resources: [translateDataAccessRole.roleArn],
        effect: iam.Effect.ALLOW,
      }),
    );
    dataBucket.grantReadWrite(translateStartFunction);
    dataTable.grantReadWriteData(translateStartFunction);

    const translateStartRule = new events.Rule(this, "TranslateStartRule", {
      eventPattern: {
        source: ["aws.transcribe"],
        detailType: ["Transcribe Job State Change"],
        detail: {
          TranscriptionJobStatus: ["COMPLETED"],
        },
      },
    });
    translateStartRule.addTarget(
      new targets.LambdaFunction(translateStartFunction),
    );
    translateStartFunction.addPermission("TranslateStartFunctionPermission", {
      action: "lambda:InvokeFunction",
      principal: new iam.ServicePrincipal("events.amazonaws.com"),
      sourceArn: translateStartRule.ruleArn,
    });

    // Reacts to Amazon Translate batch job state changes (the analogue of the
    // Transcribe job-state-change rule): on COMPLETED it assembles the translated
    // transcript artifact; on failure it records the failure on the job.
    const translateJobStateChangeFunction = new NodejsFunction(
      this,
      "TranslateJobStateChangeFunction",
      {
        runtime: lambda.Runtime.NODEJS_24_X,
        description: "Processes Amazon Translate batch job completion",
        timeout: cdk.Duration.minutes(5),
        memorySize: 1024,
        entry: "../api/src/event/translateJobStateChangeHandler.ts",
        handler: "handler",
        bundling: {
          minify: true,
          sourceMap: true,
          target: "es2020",
        },
        environment: {
          TABLE_NAME: dataTable.tableName,
          BUCKET_NAME: dataBucket.bucketName,
          APPLICATION_NAME: props.parameters.ApplicationName,
          ENVIRONMENT: props.parameters.Environment,
          ...localHandlerEnvironment,
        },
      },
    );
    translateJobStateChangeFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["translate:DescribeTextTranslationJob"],
        resources: ["*"],
        effect: iam.Effect.ALLOW,
      }),
    );
    dataBucket.grantReadWrite(translateJobStateChangeFunction);
    dataTable.grantReadWriteData(translateJobStateChangeFunction);

    const translateJobStateChangeRule = new events.Rule(
      this,
      "TranslateJobStateChangeRule",
      {
        eventPattern: {
          source: ["aws.translate"],
          detailType: ["Translate TextTranslationJob State Change"],
          detail: {
            jobStatus: [
              "COMPLETED",
              "COMPLETED_WITH_ERROR",
              "FAILED",
              "STOPPED",
            ],
          },
        },
      },
    );
    translateJobStateChangeRule.addTarget(
      new targets.LambdaFunction(translateJobStateChangeFunction),
    );
    translateJobStateChangeFunction.addPermission(
      "TranslateJobStateChangeFunctionPermission",
      {
        action: "lambda:InvokeFunction",
        principal: new iam.ServicePrincipal("events.amazonaws.com"),
        sourceArn: translateJobStateChangeRule.ruleArn,
      },
    );

    const userPoolClient = userPool.addClient("UserPoolClient", {
      supportedIdentityProviders:
        props.parameters.SupportedIdentityProviders.map((provider) =>
          cognito.UserPoolClientIdentityProvider.custom(provider),
        ),
      oAuth: {
        callbackUrls: [
          "http://localhost:3000/",
          `https://${props.parameters.FrontEndDomainName}/`,
        ],
        logoutUrls: [
          "http://localhost:3000/",
          `https://${props.parameters.FrontEndDomainName}/`,
        ],
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: false,
        },
      },
    });
    (
      userPoolClient.node.defaultChild as cognito.CfnUserPoolClient
    ).explicitAuthFlows = explicitAuthFlows;

    const providerName = cdk.Fn.importValue(
      `${props.parameters.UserPoolStackName}-UserPoolProviderName`,
    );
    const identityPool = new cognito.CfnIdentityPool(this, "IdentityPool", {
      allowUnauthenticatedIdentities: true,
      cognitoIdentityProviders: [
        {
          clientId: userPoolClient.userPoolClientId,
          providerName: providerName,
        },
      ],
    });

    const amplifyAuthorizedRole = new iam.Role(this, "AuthorizedRole", {
      assumedBy: new iam.FederatedPrincipal(
        "cognito-identity.amazonaws.com",
        {
          StringEquals: {
            "cognito-identity.amazonaws.com:aud": identityPool.ref,
          },
          "ForAnyValue:StringLike": {
            "cognito-identity.amazonaws.com:amr": "authenticated",
          },
        },
        "sts:AssumeRoleWithWebIdentity",
      ).withSessionTags(),
      inlinePolicies: {
        "cognito-authorized-policy": new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: ["cognito-identity:*"],
              resources: ["*"],
            }),
          ],
        }),
        "s3-authorized-policy": new iam.PolicyDocument({
          statements: [
            // Access files stored under the qutIdentityId prefix
            new iam.PolicyStatement({
              actions: ["s3:ListBucket"],
              resources: [dataBucket.bucketArn],
              conditions: {
                StringLike: {
                  "s3:prefix": [
                    // biome-ignore lint/suspicious/noTemplateCurlyInString: AWS IAM policy variable, not a JS template literal
                    "users/${aws:PrincipalTag/qutIdentityId}/",
                    // biome-ignore lint/suspicious/noTemplateCurlyInString: AWS IAM policy variable, not a JS template literal
                    "users/${aws:PrincipalTag/qutIdentityId}/*",
                  ],
                },
              },
            }),
            new iam.PolicyStatement({
              actions: ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
              resources: [
                `${dataBucket.bucketArn}/users/\${aws:PrincipalTag/qutIdentityId}/*`,
              ],
            }),
          ],
        }),
      },
    });

    const amplifyUnAuthorizedRole = new iam.Role(this, "UnAuthorizedRole", {
      assumedBy: new iam.FederatedPrincipal("cognito-identity.amazonaws.com", {
        StringEquals: {
          "cognito-identity.amazonaws.com:aud": identityPool.ref,
        },
        "ForAnyValue:StringLike": {
          "cognito-identity.amazonaws.com:amr": "unauthenticated",
        },
      }),
    });

    new cognito.CfnIdentityPoolRoleAttachment(
      this,
      "IdentityPoolRoleAttachment",
      {
        identityPoolId: identityPool.ref,
        roles: {
          authenticated: amplifyAuthorizedRole.roleArn,
          unauthenticated: amplifyUnAuthorizedRole.roleArn,
        },
      },
    );

    new cognito.CfnIdentityPoolPrincipalTag(this, "IdentityPoolPrincipalTag", {
      identityPoolId: identityPool.ref,
      identityProviderName: providerName,
      useDefaults: false,
      principalTags: {
        qutIdentityId: "custom:qutIdentityId",
      },
    });

    // The emulator has no custom domain or certificate, so the API is reached
    // on its execute-api route rather than behind the real deployment's TLS
    // fronted domain.
    const apiEndpoint = emulator
      ? `${emulator.endpoint.replace(/\/$/, "")}/_aws/execute-api/${api.restApiId}/${api.deploymentStage.stageName}`
      : `https://${props.parameters.ApiDomainName}`;
    const frontEndOrigin = `${frontEndScheme}://${props.parameters.FrontEndDomainName}/`;

    new cdk.CfnOutput(this, "FrontEndEnvironment", {
      description: "The environment variables to build the front end",
      value: envFormat({
        NEXT_PUBLIC_ENV: props.parameters.Environment,
        NEXT_PUBLIC_APPLICATION_NAME: props.parameters.ApplicationName,
        NEXT_PUBLIC_API_ENDPOINT: apiEndpoint,
        NEXT_PUBLIC_AUTH_IDENTITY_POOL_ID: identityPool.ref,
        NEXT_PUBLIC_AUTH_USER_POOL_ID: userPool.userPoolId,
        NEXT_PUBLIC_AUTH_USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
        NEXT_PUBLIC_AUTH_SIGN_IN_REDIRECT: frontEndOrigin,
        NEXT_PUBLIC_AUTH_SIGN_OUT_REDIRECT: frontEndOrigin,
        NEXT_PUBLIC_AUTH_DOMAIN: cdk.Fn.importValue(
          `${props.parameters.UserPoolStackName}-DomainName`,
        ),
        NEXT_PUBLIC_TRANSCRIPTION_BUCKET: dataBucket.bucketName,
        ...emulatorFrontEndEnvironment,
        ...(props.parameters.SplunkRumAccessToken
          ? {
              NEXT_PUBLIC_SPLUNK_RUM_ACCESS_TOKEN:
                props.parameters.SplunkRumAccessToken,
            }
          : {}),
        ...(props.parameters.UmamiWebsiteId && props.parameters.UmamiUrl
          ? {
              NEXT_PUBLIC_UMAMI_WEBSITE_ID: props.parameters.UmamiWebsiteId,
              NEXT_PUBLIC_UMAMI_URL: props.parameters.UmamiUrl,
            }
          : {}),
      }),
    });
  }
}
