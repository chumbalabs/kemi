import os
from dotenv import load_dotenv

print("Testing environment variable loading...")
print(f"Current working directory: {os.getcwd()}")

# Test loading from different paths
print("\n1. Loading from '../.env':")
load_dotenv('../.env')
key1 = os.getenv('GEMINI_API_KEY')
print(f"   GEMINI_API_KEY: {'Found' if key1 else 'Not found'}")
if key1:
    print(f"   Preview: {key1[:10]}...")

print("\n2. Loading from '.env' (current dir):")
load_dotenv('.env')
key2 = os.getenv('GEMINI_API_KEY')
print(f"   GEMINI_API_KEY: {'Found' if key2 else 'Not found'}")

print("\n3. Loading from absolute path:")
import pathlib
root_env = pathlib.Path(__file__).parent.parent / '.env'
print(f"   Trying: {root_env}")
load_dotenv(root_env)
key3 = os.getenv('GEMINI_API_KEY')
print(f"   GEMINI_API_KEY: {'Found' if key3 else 'Not found'}")
if key3:
    print(f"   Preview: {key3[:10]}...")

print("\n4. All environment variables with 'GEMINI':")
for key, value in os.environ.items():
    if 'GEMINI' in key:
        print(f"   {key}: {value[:10]}..." if value else f"   {key}: (empty)")