# Transcription

[eResearch QUT](https://www.qut.edu.au/research/office-of-eresearch) Transcription Service

![homepage](images/homepage.png)
![transcription](images/transcription.png)

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
cd api
npm install
```

```
cd frontend
yarn install
mkdir -p out
```

```
cd deployment
npm install
```

### *Optional: Create GitHub deployment stack*

```
export GITHUB_FILTERS="dev"
cdk deploy TranscriptionGitHubStack
cdk deploy TranscriptionFrontEndGitHubStack
```

### *Optional: Assume the GitHub role locally*


`~/.aws/config`:

```
[profile qut-dev]
region = ap-southeast-2

[profile qut-dev-github]
role_arn = <TranscriptionGitHubStack.deployRoleArn>
source_profile = qut-dev
region = ap-southeast-2

[profile qut-dev-github-frontend]
role_arn = <TranscriptionFrontEndGitHubStack.deployRoleArn>
source_profile = qut-dev
region = ap-southeast-2
```

Deploy the stacks with the GitHub role:

```
AWS_PROFILE=qut-dev-github cdk deploy TranscriptionStack
AWS_PROFILE=qut-dev-github-frontend cdk deploy TranscriptionFrontEndStack
```

### Deploy base stack

Also builds the lambda functions

```
cdk deploy TranscriptionStack
```

### Build the frontend

```
export STACK_NAME=dev-transcription
aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='FrontEndEnvironment'].OutputValue" --output text > ../frontend/.env.production
```

From the top-level `frontend` directory:

```
yarn build
```

### Deploy frontend stack

```
cdk deploy FrontEndStack
```

## Local frontend development

```
cd frontend
export STACK_NAME=dev-transcription
aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='FrontEndEnvironment'].OutputValue" --output text > .env.local
yarn dev
```