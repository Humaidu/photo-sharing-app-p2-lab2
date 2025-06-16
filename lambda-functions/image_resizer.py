import boto3
from PIL import Image
import io

s3 = boto3.client('s3')

def lambda_handler(event, context):
    # Get S3 object info from the event
    source_bucket = event['Records'][0]['s3']['bucket']['name']
    source_key = event['Records'][0]['s3']['object']['key']

    # Destination bucket (thumbnails)
    target_bucket = "photo-sharing-thumbnails-050"
    target_key = f"thumb-{source_key}"

    try:
        # Download original image from source bucket
        response = s3.get_object(Bucket=source_bucket, Key=source_key)
        image = Image.open(io.BytesIO(response['Body'].read()))

        # Resize image (thumbnail size: max 150x150)
        image.thumbnail((150, 150))

        # Save resized image to a byte buffer
        buffer = io.BytesIO()
        image.save(buffer, format="JPEG")
        buffer.seek(0)

        # Upload thumbnail to the destination bucket
        s3.put_object(
            Bucket=target_bucket,
            Key=target_key,
            Body=buffer,
            ContentType="image/jpeg"
        )

        print(f"Thumbnail saved as {target_key} in {target_bucket}")
        return {'statusCode': 200}

    except Exception as e:
        print(f"Error resizing image: {e}")
        return {
            'statusCode': 500, 
            'body': str(e)
        }
