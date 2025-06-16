
# Using a Prebuilt Pillow Layer (via Klayers)

Use Klayers' API to fetch the most up-to-date ARN for Pillow in your region. Replace `us-east-1` and `p3.11` as needed:

```
https://api.klayers.cloud/api/v2/p3.11/layers/latest/us-east-1/Pillow

```
This returns the current ARN, so you don't need to track versions manually 

**Example**

For python 3.9 version

```
arn:aws:lambda:eu-west-1:770693421928:layer:Klayers-p39-pillow:1

```