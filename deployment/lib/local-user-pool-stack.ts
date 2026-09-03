import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import type { Construct } from "constructs";

/**
 * The Cognito attributes the application reads from the identity token. The
 * real user pool is populated by the QUT identity provider; locally they are
 * set on the seeded test user instead.
 */
export const CUSTOM_ATTRIBUTES = [
  "qutIdentityId",
  "uid",
  "username",
  "eResearchGroups",
] as const;

export interface LocalUserPoolStackProps extends cdk.StackProps {
  /**
   * Prefix for the exported values, matching the `UserPoolStackName` parameter
   * that `ApiStack` interpolates into its `Fn::ImportValue` calls.
   */
  readonly exportPrefix: string;
  /**
   * Host serving the Cognito hosted UI. MiniStack serves `/oauth2/authorize`
   * and friends on the gateway rather than on the pool domain host, so this is
   * the emulator endpoint rather than an `amazoncognito.com` address.
   */
  readonly hostedUiDomain: string;
}

/**
 * Stands in for the QUT user pool stack when deploying against a local AWS
 * emulator. Real deployments import an externally managed user pool, so this
 * stack is only ever created on the local branch of `bin/deployment.ts`.
 *
 * It exists to satisfy the three `Fn::ImportValue` calls in `ApiStack`, which
 * are left untouched so the stack synthesises identically either way.
 */
export class LocalUserPoolStack extends cdk.Stack {
  readonly userPool: cognito.UserPool;

  constructor(scope: Construct, id: string, props: LocalUserPoolStackProps) {
    super(scope, id, props);

    this.userPool = new cognito.UserPool(this, "UserPool", {
      userPoolName: props.exportPrefix,
      signInAliases: { username: true, email: true },
      customAttributes: Object.fromEntries(
        CUSTOM_ATTRIBUTES.map((name) => [
          name,
          new cognito.StringAttribute({ mutable: true }),
        ]),
      ),
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.userPool.addDomain("Domain", {
      cognitoDomain: { domainPrefix: props.exportPrefix },
    });

    new cdk.CfnOutput(this, "UserPoolArn", {
      exportName: `${props.exportPrefix}-UserPoolArn`,
      value: this.userPool.userPoolArn,
    });

    new cdk.CfnOutput(this, "UserPoolProviderName", {
      exportName: `${props.exportPrefix}-UserPoolProviderName`,
      value: this.userPool.userPoolProviderName,
    });

    new cdk.CfnOutput(this, "DomainName", {
      exportName: `${props.exportPrefix}-DomainName`,
      value: props.hostedUiDomain,
    });

    new cdk.CfnOutput(this, "UserPoolId", {
      description: "Target for the local Cognito user seeding script",
      value: this.userPool.userPoolId,
    });
  }
}
