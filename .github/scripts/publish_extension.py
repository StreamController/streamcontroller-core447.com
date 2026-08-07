#!/usr/bin/env python3
"""
Upload a built GNOME Shell extension zip to extensions.gnome.org.

extensions.gnome.org moved the upload target from the legacy `/upload/`
form endpoint to a JSON API at `/api/v1/extensions` (with the compliance
field renamed from `gplv2_compliant` to `shell_license_compliant`). The
`gnome-extension-publisher` PyPI package still posts to the old endpoint,
which now replies "405 Method Not Allowed", so we do the upload ourselves.
"""

import os
import sys

import requests

BASE_URL = "https://extensions.gnome.org"


def main() -> int:
    zip_path = sys.argv[1] if len(sys.argv) > 1 else None
    username = os.environ.get("GEP_USERNAME")
    password = os.environ.get("GEP_PASSWORD")

    if not zip_path or not os.path.isfile(zip_path):
        print(f"ERROR: zip file not found: {zip_path}", file=sys.stderr)
        return 1
    if not username or not password:
        print("ERROR: GEP_USERNAME and GEP_PASSWORD must be set", file=sys.stderr)
        return 1

    session = requests.Session()
    session.headers.update({"referer": f"{BASE_URL}/accounts/login/"})

    login_page = session.get(f"{BASE_URL}/accounts/login/")
    login_page.raise_for_status()
    csrftoken = session.cookies.get("csrftoken")
    if not csrftoken:
        print("ERROR: no CSRF token on login page", file=sys.stderr)
        return 1

    login_response = session.post(
        f"{BASE_URL}/accounts/login/",
        data={
            "csrfmiddlewaretoken": csrftoken,
            "username": username,
            "password": password,
            "next": "/",
        },
    )
    login_response.raise_for_status()
    if "Please enter a correct username and password" in login_response.text:
        print("ERROR: invalid GNOME Extensions credentials", file=sys.stderr)
        return 1

    # Session login rotates the CSRF token, so fetch a fresh one.
    upload_page = session.get(f"{BASE_URL}/upload/")
    upload_page.raise_for_status()
    csrftoken = session.cookies.get("csrftoken")
    if not csrftoken:
        print("ERROR: no CSRF token after login (login likely failed)", file=sys.stderr)
        return 1

    with open(zip_path, "rb") as f:
        upload_response = session.post(
            f"{BASE_URL}/api/v1/extensions",
            files={"source": f},
            data={
                "shell_license_compliant": "true",
                "tos_compliant": "true",
                "csrfmiddlewaretoken": csrftoken,
            },
        )

    if upload_response.status_code == 201:
        print("Uploaded successfully.")
        return 0

    print(f"ERROR: Upload failed. Status: {upload_response.status_code}", file=sys.stderr)
    try:
        print(upload_response.json(), file=sys.stderr)
    except ValueError:
        print(upload_response.text[:2000], file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
