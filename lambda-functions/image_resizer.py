import boto3
from PIL import Image
import io
from datetime import datetime

s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('ImageMetadata')

def lambda_handler(event, context):
    source_bucket = event['Records'][0]['s3']['bucket']['name']
    source_key = event['Records'][0]['s3']['object']['key']

    target_bucket = "photo-sharing-thumbnails-050"
    target_key = f"thumb-{source_key}"

    try:
        # Get original image
        response = s3.get_object(Bucket=source_bucket, Key=source_key)
        
        # Try to read email metadata
        metadata = response.get('Metadata', {})
        email = metadata.get('email', 'unknown')

        image = Image.open(io.BytesIO(response['Body'].read()))

        # Resize image
        image = image.convert("RGB")  # Ensure compatibility with JPEG
        image.thumbnail((150, 150))

        buffer = io.BytesIO()
        image.save(buffer, format="JPEG")
        buffer.seek(0)

        # Upload thumbnail
        s3.put_object(
            Bucket=target_bucket,
            Key=target_key,
            Body=buffer,
            ContentType="image/jpeg"
        )

        # Construct image URLs
        original_url = f"https://{source_bucket}.s3.amazonaws.com/{source_key}"
        thumbnail_url = f"https://{target_bucket}.s3.amazonaws.com/{target_key}"

        # Save metadata in DynamoDB
        table.put_item(Item={
            'filename': source_key,
            'original_url': original_url,
            'thumbnail_url': thumbnail_url,
            'uploaded_at': datetime.utcnow().isoformat(),
            'email': email
        })

        print(f"Stored metadata for {source_key}")
        return {'statusCode': 200}

    except Exception as e:
        print(f"Error resizing image: {e}")
        return {
            'statusCode': 500,
            'body': str(e)
        }
