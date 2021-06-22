# transcription

QUT eResearch transcription service

## Linting and Formatting

eslint formatting rules can be configured in the `package.json` files

prettier can be configured in `.prettierrc` and `.prettierignore`.

To format files using prettier, use:

```
yarn prettier --write .
```

## Manual deployment instructions

```
export ENV=dev # or qa, prod
```

### In root

```
sam build
sam deploy --s3-bucket qut-lambda-code-ap-southeast-2 --s3-prefix local --profile "qut-eresearch-$ENV" --region ap-southeast-2 --stack-name transcription --parameter-overrides "Environment=$ENV" --capabilities CAPABILITY_IAM
aws cloudformation describe-stacks --stack-name transcription --profile qut-eresearch-$ENV --region ap-southeast-2 --query "Stacks[0].Outputs[?OutputKey=='FrontEndEnvironment'].OutputValue" --output text | sed '/^[[:space:]]*$/d' > frontend/.env.$ENV
```

### In frontend

```
yarn install
yarn build-$ENV
export $(aws cloudformation describe-stacks --stack-name transcription --profile qut-eresearch-$ENV --region ap-southeast-2 --query "Stacks[0].Outputs[?OutputKey=='DistributionEnvironment'].OutputValue" --output text | sed '/^[[:space:]]*$/d' | xargs)
aws s3 sync frontend/build $DISTRIBUTION_BUCKET --profile qut-eresearch-$ENV
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*" --profile qut-eresearch-$ENV
```