import json
import boto3

# Initialize a client for S3 service
s3 = boto3.client('s3')

# Specify the S3 bucket where thumbnail images are stored
BUCKET_NAME = 'photo-sharing-thumbnails-050'

def lambda_handler(event, context):
    try:
        # Retrieve the list of objects (images) from the specified S3 bucket
        response = s3.list_objects_v2(Bucket=BUCKET_NAME)
        image_urls = []  # List to store the image URLs

        # Loop through the objects in the bucket
        for obj in response.get('Contents', []):
            key = obj['Key']  # Get the file name (key) of the object
            # Construct the public URL of the image
            url = f"https://{BUCKET_NAME}.s3.amazonaws.com/{key}"
            image_urls.append(url)  # Add the image URL to the list

        # Return a JSON response with the list of image URLs
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',  # Allow CORS from any origin
                'Access-Control-Allow-Headers': '*',  # Allow any headers
                'Access-Control-Allow-Methods': 'GET,OPTIONS'  # Allow GET and OPTIONS methods
            },
            'body': json.dumps(image_urls)  # Convert the list to a JSON string
        }

    except Exception as e:
        # Handle and return any errors that occur
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*'  # Ensure CORS even in case of error
            },
            'body': json.dumps({'error': str(e)})  # Return error message as JSON
        }
