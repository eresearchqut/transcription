# transcription

QUT eResearch transcription service

## Linting and Formatting

### Frontend

```
cd frontend
yarn lint
yarn fmt
```

### API

```
cd api
npm run lint
npm run fmt
```

Ignore formatting revisions in `.git-blame-ignore-revs`:

```
git config blame.ignoreRevsFile .git-blame-ignore-revs
```

## Manual deployment instructions

```
export ENV=dev # or qa, prod
```

### In root

```
sam build
sam deploy --s3-bucket qut-lambda-code-ap-southeast-2 --s3-prefix local --profile "qut-eresearch-$ENV" --region ap-southeast-2 --stack-name $ENV-transcription --parameter-overrides "Environment=$ENV" --capabilities CAPABILITY_IAM
aws cloudformation describe-stacks --stack-name $ENV-transcription --profile qut-eresearch-$ENV --region ap-southeast-2 --query "Stacks[0].Outputs[?OutputKey=='FrontEndEnvironment'].OutputValue" --output text | sed '/^[[:space:]]*$/d' > frontend/.env.$ENV
```

### In frontend

```
yarn install
yarn build-$ENV
export $(aws cloudformation describe-stacks --stack-name $ENV-transcription --profile qut-eresearch-$ENV --region ap-southeast-2 --query "Stacks[0].Outputs[?OutputKey=='DistributionEnvironment'].OutputValue" --output text | sed '/^[[:space:]]*$/d' | xargs)
aws s3 sync frontend/build $DISTRIBUTION_BUCKET --profile qut-eresearch-$ENV
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*" --profile qut-eresearch-$ENV
```
