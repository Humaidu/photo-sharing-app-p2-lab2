import json
import boto3

# Create an S3 client using Boto3
s3 = boto3.client('s3')

# Define the S3 bucket where images will be uploaded
BUCKET_NAME = 'photo-sharing-app-bucket-050'

def lambda_handler(event, context):
    try:
        # Get query parameters from the API Gateway request
        # If none are provided, use an empty dictionary
        query = event.get('queryStringParameters') or {}

        # Extract the 'filename' parameter from the query string
        filename = query.get('filename')

        # If 'filename' is missing, return a 400 Bad Request response
        if not filename:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',  # Allow requests from any origin (CORS)
                    'Access-Control-Allow-Methods': 'GET,OPTIONS',  # Allowed HTTP methods
                    'Access-Control-Allow-Headers': '*'  # Allow all headers
                },
                'body': json.dumps({'error': 'Missing filename query parameter'})
            }

        # Generate a pre-signed URL to allow the client to upload a file to S3 directly
        presigned_url = s3.generate_presigned_url(
            'put_object',  # Operation: Upload (PUT) object
            Params={
                'Bucket': BUCKET_NAME,  # Target bucket
                'Key': filename,        # Name of the file to be uploaded
                'ContentType': 'image/jpeg',
            },
            ExpiresIn=3600  # URL expiration time in seconds (1 hour)
        )

        # Return the pre-signed URL to the client
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',  # Enable CORS
                'Access-Control-Allow-Methods': 'GET,OPTIONS',
                'Access-Control-Allow-Headers': '*'
            },
            'body': json.dumps({'uploadUrl': presigned_url})
        }

    except Exception as e:
        # Handle any unexpected errors and return a 500 Internal Server Error response
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET,OPTIONS',
                'Access-Control-Allow-Headers': '*'
            },
            'body': json.dumps({'error': str(e)})
        }
