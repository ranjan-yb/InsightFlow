import six

print("Six location:", six.__file__)
print("Six version:", six.__version__)
print("Has moves:", hasattr(six, "moves"))

from six.moves import configparser

print("Six import successful!")