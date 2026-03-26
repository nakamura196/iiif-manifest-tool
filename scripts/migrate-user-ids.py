#!/usr/bin/env python3
"""
Migrate S3 user data from NextAuth Google IDs to Firebase UIDs.

This script:
1. Lists all user directories in S3 collections/
2. Reads user-mappings/{userId}.json to get email
3. Looks up Firebase UID by email
4. Copies S3 objects from old path to new path
5. Optionally deletes old paths

Prerequisites:
    pip install boto3 firebase-admin

Usage:
    # Dry run (default)
    python scripts/migrate-user-ids.py

    # Execute migration
    python scripts/migrate-user-ids.py --execute

Environment variables:
    S3_BUCKET_NAME, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_REGION, S3_ENDPOINT
    GOOGLE_APPLICATION_CREDENTIALS (or set FIREBASE_PROJECT_ID)
"""

import argparse
import json
import os
import sys

import boto3
import firebase_admin
from firebase_admin import auth, credentials


def init_s3():
    kwargs = {
        "aws_access_key_id": os.environ["S3_ACCESS_KEY_ID"],
        "aws_secret_access_key": os.environ["S3_SECRET_ACCESS_KEY"],
        "region_name": os.environ.get("S3_REGION", "us-east-1"),
    }
    endpoint = os.environ.get("S3_ENDPOINT", "").strip()
    if endpoint:
        kwargs["endpoint_url"] = endpoint
    return boto3.client("s3", **kwargs)


def init_firebase():
    project_id = os.environ.get("FIREBASE_PROJECT_ID", "ge-editor")
    cred_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if cred_path:
        cred = credentials.Certificate(cred_path)
    else:
        cred = credentials.ApplicationDefault()
    firebase_admin.initialize_app(cred, {"projectId": project_id})


def get_user_mappings(s3, bucket):
    """Read user-mappings/ from S3 to get email for each user ID."""
    mappings = {}
    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=bucket, Prefix="user-mappings/"):
        for obj in page.get("Contents", []):
            key = obj["Key"]
            if key.endswith(".json"):
                resp = s3.get_object(Bucket=bucket, Key=key)
                data = json.loads(resp["Body"].read())
                user_id = data.get("userId", "")
                email = data.get("email", "")
                if user_id and email:
                    mappings[user_id] = data
    return mappings


def get_firebase_uid_by_email(email):
    """Look up Firebase UID by email. Create user if not found."""
    try:
        user = auth.get_user_by_email(email)
        return user.uid
    except auth.UserNotFoundError:
        print(f"  Firebase user not found for {email}, creating...")
        user = auth.create_user(email=email)
        return user.uid


def list_s3_objects(s3, bucket, prefix):
    """List all objects under a prefix."""
    objects = []
    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        for obj in page.get("Contents", []):
            objects.append(obj["Key"])
    return objects


def copy_s3_objects(s3, bucket, old_prefix, new_prefix, execute=False):
    """Copy all objects from old_prefix to new_prefix."""
    objects = list_s3_objects(s3, bucket, old_prefix)
    copied = 0
    for key in objects:
        new_key = key.replace(old_prefix, new_prefix, 1)
        if execute:
            s3.copy_object(
                Bucket=bucket,
                CopySource={"Bucket": bucket, "Key": key},
                Key=new_key,
            )
            print(f"  Copied: {key} -> {new_key}")
        else:
            print(f"  [DRY RUN] Would copy: {key} -> {new_key}")
        copied += 1
    return copied


def main():
    parser = argparse.ArgumentParser(description="Migrate S3 user IDs to Firebase UIDs")
    parser.add_argument("--execute", action="store_true", help="Execute migration (default: dry run)")
    args = parser.parse_args()

    bucket = os.environ.get("S3_BUCKET_NAME", "pocket.webcatplus.jp")

    print("Initializing S3...")
    s3 = init_s3()

    print("Initializing Firebase...")
    init_firebase()

    print(f"\nReading user mappings from s3://{bucket}/user-mappings/...")
    mappings = get_user_mappings(s3, bucket)
    print(f"Found {len(mappings)} user mappings")

    # Also check collections/ for users without mappings
    print(f"\nListing user directories in s3://{bucket}/collections/...")
    resp = s3.list_objects_v2(Bucket=bucket, Prefix="collections/", Delimiter="/")
    user_dirs = [p["Prefix"].split("/")[1] for p in resp.get("CommonPrefixes", [])]
    print(f"Found {len(user_dirs)} user directories")

    print("\n=== Migration Plan ===\n")
    total_copied = 0

    for old_id in user_dirs:
        mapping = mappings.get(old_id, {})
        email = mapping.get("email", "")
        name = mapping.get("name", old_id)

        if not email:
            print(f"SKIP {old_id} ({name}): no email in mapping")
            continue

        firebase_uid = get_firebase_uid_by_email(email)

        if old_id == firebase_uid:
            print(f"SKIP {old_id} ({email}): already using Firebase UID")
            continue

        print(f"\nMIGRATE {old_id} ({email}) -> {firebase_uid}")

        # Migrate collections/
        copied = copy_s3_objects(
            s3, bucket,
            f"collections/{old_id}/",
            f"collections/{firebase_uid}/",
            execute=args.execute,
        )
        total_copied += copied

        # Migrate user-mappings/
        copy_s3_objects(
            s3, bucket,
            f"user-mappings/{old_id}.json",
            f"user-mappings/{firebase_uid}.json",
            execute=args.execute,
        )

    print(f"\n=== Summary ===")
    print(f"Total objects to copy: {total_copied}")
    if not args.execute:
        print("This was a DRY RUN. Use --execute to perform the migration.")


if __name__ == "__main__":
    main()
