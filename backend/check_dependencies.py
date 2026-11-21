import six
import boto3
import botocore

print("Six:", six.__version__, six.__file__)
print("Boto3:", boto3.__version__)
print("Botocore:", botocore.__version__)

from six.moves import configparser

print("All AWS dependencies imported successfully!")