# transcription
QUT eResearch Transcription API


sam build
sam deploy --s3-bucket qut-lambda-code-ap-southeast-2 --s3-prefix local --profile qut-eresearch-$ENV --region ap-southeast-2 --stack-name transcription  --parameter-overrides Environment=$ENV --capabilities CAPABILITY_IAM
aws cloudformation describe-stacks --stack-name transcription --profile qut-eresearch-$ENV --region ap-southeast-2 --query "Stacks[0].Outputs[?OutputKey=='FrontEndEnvironment'].OutputValue" --output text | sed '/^[[:space:]]*$/d' > frontend/.env.$ENV
(cd frontend; yarn install)
(cd frontend; yarn build-$ENV)
export $(aws cloudformation describe-stacks --stack-name transcription --profile qut-eresearch-$ENV --region ap-southeast-2 --query "Stacks[0].Outputs[?OutputKey=='DistributionEnvironment'].OutputValue" --output text | sed '/^[[:space:]]*$/d' | xargs)
aws s3 sync frontend/build $DISTRIBUTION_BUCKET --profile qut-eresearch-$ENV
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*" --profile qut-eresearch-$ENV
