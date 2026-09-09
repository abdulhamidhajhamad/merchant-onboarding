export const ENV_CONFIG = {
  port: process.env.PORT || '3000',
  awsRegion: process.env.AWS_REGION || 'us-east-1',
  dynamodbEndpoint: process.env.DYNAMODB_ENDPOINT,
  s3Endpoint: process.env.S3_ENDPOINT,
};