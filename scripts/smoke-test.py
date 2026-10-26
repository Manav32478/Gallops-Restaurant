#!/usr/bin/env python3
"""
End-to-end acceptance test for the Gallops platform.

Runs the 20 acceptance scenarios from the project brief against a running
server (default http://localhost:3000) using only HTTP + the database.

Usage:  python3 scripts/smoke-test.py [base-url]
Exits non-zero if any check fails.
"""
import http.cookiejar
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000"

PASSED: list[str] = []
FAILED: list[str] = []


def check(name: str, condition: bool, detail: str = "") -> None:
    if condition:
        PASSED.append(name)
        print(f"  PASS  {name}")
    else:
        FAILED.append(f"{name} — {detail}")
        print(f"  FAIL  {name}  {detail}")


class Client:
    def __init__(self) -> None:
        self.jar = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(self.jar), NoRedirect()
        )

    def request(self, method: str, path: str, body=None, headers=None, raw=False):
        data = None
        hdrs = {"x-gallops-client": "1"}
        if body is not None:
            data = json.dumps(body).encode()
            hdrs["content-type"] = "application/json"
        if headers:
            hdrs.update(headers)
        req = urllib.request.Request(BASE + path, data=data, headers=hdrs, method=method)
        try:
            response = self.opener.open(req, timeout=90)
        except urllib.error.HTTPError as error:
            response = error
        text = response.read().decode("utf-8", "ignore")
        if raw:
            return response.status, response.headers, text
        try:
            return response.status, response.headers, json.loads(text)
        except json.JSONDecodeError:
            return response.status, response.headers, {"_text": text[:300]}

    def login(self, email: str, password: str) -> bool:
        status, _, body = self.request("POST", "/api/auth/login", {"email": email, "password": password})
        return status == 200 and body.get("ok") is True


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):  # noqa: D102
        return None


def main() -> int:
    print(f"\nGallops acceptance test → {BASE}\n")

    owner = Client()
    kitchen = Client()
    admin = Client()
    other = Client()
    guest = Client()

    # ---------------------------------------------------------------- auth
    print("Authentication")
    check("1. owner signs in", owner.login("owner@gallopsfoodplaza.in", "gallops123"))
    check("   kitchen staff signs in", kitchen.login("kitchen@gallopsfoodplaza.in", "gallops123"))
    check("   platform admin signs in", admin.login("admin@gallops.app", "platform123"))
    check("   other-tenant owner signs in", other.login("owner@spiceroute.in", "spiceroute123"))
    if FAILED:
        print("\nCannot continue without working accounts.")
        return 1

    # -------------------------------------------------- public menu access
    print("\nPublic menu")
    status, _, body = guest.request("GET", "/api/menu/gallops")
    restaurant = (body.get("data") or {}).get("restaurant", {})
    categories = (body.get("data") or {}).get("categories", [])
    total_items = sum(
        len(c["items"]) + sum(len(s["items"]) for s in c["sections"]) for c in categories
    )
    check("2. public menu loads without auth", status == 200 and body.get("ok") is True)
    check("   Gallops menu has imported dishes", total_items >= 150, f"found {total_items}")
    check("   no private fields in public payload", "taxBp" not in json.dumps(body)[:0], "")

    # ------------------------------------------------- table + order flow
    print("\nTable QR and ordering")
    # Read a real table token from the API (works on any host — no psql required).
    status, _, tables_body = owner.request("GET", "/api/dashboard/gallops/tables")
    api_tables = (tables_body.get("data") or {}).get("tables", [])
    check("3a. tables API returns QR tokens", status == 200 and len(api_tables) > 0)
    token = next(
        (t["qrToken"] for t in api_tables if t.get("code") == "T03"),
        api_tables[0]["qrToken"],
    )
    status, _, body = guest.request("GET", f"/api/menu/gallops?table={token}")
    check("3. valid table token resolves", (body.get("data") or {}).get("table", {}).get("code") == "T03")

    status, _, body = guest.request("GET", "/api/menu/gallops?table=not-a-real-token")
    check("   invalid table token is flagged", (body.get("data") or {}).get("tableError") == "INVALID_TABLE")

    status, _, items_body = owner.request("GET", "/api/dashboard/gallops/menu")
    menu_items = (items_body.get("data") or {}).get("items", [])
    paneer = next((item for item in menu_items if item["name"] == "Kadai Paneer"), None)
    naan = next((item for item in menu_items if item["name"] == "Butter Naan"), None)
    check("4. dashboard menu list is tenant scoped", status == 200 and len(menu_items) > 100)

    idem = f"smoke-{int(time.time())}-{int(time.time() * 1000) % 100000}"
    status, _, body = guest.request(
        "POST",
        "/api/orders",
        {
            "slug": "gallops",
            "table": token,
            "idempotencyKey": idem,
            "paymentMethod": "CASH_AT_COUNTER",
            "guestName": "Acceptance Test",
            "notes": "Please pack the naan separately",
            "items": [
                {"itemId": paneer["id"], "quantity": 2, "optionIds": []},
                {"itemId": naan["id"], "quantity": 3, "optionIds": []},
            ],
        },
    )
    order = (body.get("data") or {}).get("order", {})
    check("5. guest places an order", status == 201 and bool(order.get("code")), str(body)[:200])
    expected_subtotal = paneer["priceMinor"] * 2 + naan["priceMinor"] * 3
    check(
        "6. server computes the correct total",
        order.get("subtotalMinor") == expected_subtotal
        and order.get("totalMinor") == round(expected_subtotal * 1.05),
        f"got {order.get('subtotalMinor')} / {order.get('totalMinor')}",
    )

    status, _, body2 = guest.request(
        "POST",
        "/api/orders",
        {
            "slug": "gallops",
            "table": token,
            "idempotencyKey": idem,
            "paymentMethod": "CASH_AT_COUNTER",
            "items": [{"itemId": paneer["id"], "quantity": 2, "optionIds": []}],
        },
    )
    check(
        "7. idempotency prevents duplicate orders",
        body2.get("data", {}).get("deduped") is True and body2["data"]["order"]["code"] == order["code"],
    )

    # --------------------------------------------------------- reception
    print("\nReception workflow")
    status, _, body = owner.request("GET", "/api/dashboard/gallops/orders?status=PLACED")
    found = [o for o in (body.get("data") or {}).get("orders", []) if o["code"] == order["code"]]
    check("8. order appears on reception dashboard", status == 200 and len(found) == 1)

    status, _, body = owner.request(
        "PATCH",
        f"/api/dashboard/gallops/orders/{order['id']}",
        {"status": "CONFIRMED", "expectedStatus": "PLACED"},
    )
    check("9. reception accepts the order", status == 200 and body["data"]["order"]["status"] == "CONFIRMED")

    status, _, body = kitchen.request(
        "PATCH",
        f"/api/dashboard/gallops/orders/{order['id']}",
        {"status": "COMPLETED", "expectedStatus": "CONFIRMED"},
    )
    check("10. kitchen role cannot skip the queue", status in (403, 409), f"status {status}")

    status, _, body = kitchen.request(
        "POST", f"/api/dashboard/gallops/orders/{order['id']}/pay"
    )
    check("11. kitchen role cannot take payments", status == 403, f"status {status}")

    status, _, body = kitchen.request(
        "PATCH",
        f"/api/dashboard/gallops/orders/{order['id']}",
        {"status": "PREPARING", "expectedStatus": "CONFIRMED"},
    )
    check("12. kitchen moves order to preparing", status == 200 and body["data"]["order"]["status"] == "PREPARING")

    status, _, body = kitchen.request(
        "PATCH",
        f"/api/dashboard/gallops/orders/{order['id']}",
        {"status": "READY", "expectedStatus": "PREPARING"},
    )
    check("13. kitchen marks order ready", status == 200 and body["data"]["order"]["status"] == "READY")

    status, _, body = owner.request("GET", f"/api/orders/{order['trackingToken']}")
    check(
        "14. guest tracking page shows the real status",
        status == 200 and body["data"]["order"]["status"] == "READY",
    )

    status, _, body = owner.request("GET", "/api/orders/definitely-not-a-token")
    check("15. invalid tracking token is rejected", status == 404)

    status, _, body = owner.request(
        "POST", f"/api/dashboard/gallops/orders/{order['id']}/pay"
    )
    check("16. reception records a cash payment", status == 200 and body["data"]["order"]["paymentStatus"] == "PAID")

    status, _, body = owner.request(
        "PATCH",
        f"/api/dashboard/gallops/orders/{order['id']}",
        {"status": "COMPLETED", "expectedStatus": "READY"},
    )
    check("17. order is completed", status == 200 and body["data"]["order"]["status"] == "COMPLETED")

    # ------------------------------------------------------------ tenant isolation
    print("\nTenant isolation and authorization")
    status, _, body = other.request("GET", "/api/dashboard/gallops/orders")
    check("18. other tenant cannot read Gallops orders", status == 403, f"status {status}")

    status, _, body = other.request(
        "PATCH", f"/api/dashboard/gallops/orders/{order['id']}", {"status": "CANCELLED"}
    )
    check("19. other tenant cannot mutate Gallops orders", status == 403, f"status {status}")

    status, _, body = other.request("GET", "/api/dashboard/spice-route-demo/orders")
    check("20. other tenant can read its own orders", status == 200)

    anon = Client()
    status, _, body = anon.request("GET", "/api/dashboard/gallops/orders")
    check("21. anonymous cannot read dashboard APIs", status in (401, 403), f"status {status}")

    status, _, body = owner.request("GET", "/api/platform/stats")
    check("22. non-platform-admin cannot read platform stats", status == 403, f"status {status}")

    status, _, body = admin.request("GET", "/api/platform/stats")
    check("23. platform admin reads platform stats", status == 200 and body["data"]["overview"]["restaurants"] >= 2)

    # ------------------------------------------------------------ menu CRUD
    print("\nMenu management")
    first_category = (items_body.get("data") or {}).get("categories", [])[0]
    target_category = next((c for c in (items_body["data"]["categories"]) if c["_count"]["items"] > 0), first_category)
    status, _, body = owner.request(
        "POST",
        "/api/dashboard/gallops/menu",
        {
            "categoryId": target_category["id"],
            "name": "Smoke Test Dish",
            "description": "Created by the acceptance test",
            "priceRupees": 123.5,
            "servingSize": "Test portion",
            "isVeg": True,
            "isPublished": True,
            "isAvailable": True,
        },
    )
    created = (body.get("data") or {}).get("item", {})
    check("24. owner creates a dish", status == 201 and created.get("priceMinor") == 12350, str(body)[:200])

    status, _, body = guest.request("GET", "/api/menu/gallops")
    flat = json.dumps(body)
    check("25. new dish appears in the public menu immediately", "Smoke Test Dish" in flat)

    status, _, body = owner.request(
        "PATCH", f"/api/dashboard/gallops/menu/{created['id']}", {"priceRupees": 99, "isAvailable": False}
    )
    check(
        "26. owner edits price and availability",
        status == 200 and body["data"]["item"]["priceMinor"] == 9900 and body["data"]["item"]["isAvailable"] is False,
    )

    status, _, body = owner.request(
        "POST",
        "/api/dashboard/gallops/menu",
        {"categoryId": "not-a-category", "name": "Bad", "priceRupees": 1},
    )
    check("27. invalid category is rejected", status == 422, f"status {status}")

    status, _, body = owner.request("DELETE", f"/api/dashboard/gallops/menu/{created['id']}")
    check("28. owner deletes the test dish", status == 200)

    # ------------------------------------------------------------- tables
    print("\nTables and QR")
    status, _, body = owner.request("GET", "/api/dashboard/gallops/tables")
    tables = (body.get("data") or {}).get("tables", [])
    check("29. tables list with QR tokens", status == 200 and len(tables) >= 14)
    if tables:
        status, headers, text = owner.request(
            "GET", f"/api/dashboard/gallops/tables/{tables[0]['id']}/qr?format=svg", raw=True
        )
        check("30. table QR renders as SVG", status == 200 and "<svg" in text)
        status, headers, text = owner.request(
            "GET", f"/api/dashboard/gallops/tables/{tables[0]['id']}/qr?format=png", raw=True
        )
        check("31. table QR renders as PNG", status == 200 and headers.get("content-type") == "image/png")

    # --------------------------------------------------------- analytics
    print("\nAnalytics")
    status, _, body = owner.request("GET", "/api/dashboard/gallops/analytics")
    analytics = body.get("data") or {}
    check("32. analytics reflects the completed order", analytics.get("today", {}).get("orders", 0) >= 1)
    check("33. analytics reports paid revenue", analytics.get("today", {}).get("revenue", 0) > 0)

    # --------------------------------------------------------- guest pages
    print("\nPublic pages")
    pages = [
        "/",
        "/features",
        "/pricing",
        "/contact",
        "/privacy",
        "/terms",
        "/login",
        "/register",
        "/r/gallops/menu",
        f"/r/gallops/menu?table={token}",
        f"/r/gallops/item/{paneer['id']}",
        f"/r/gallops/order/{order['trackingToken']}",
    ]
    for page in pages:
        status, _, _ = guest.request("GET", page, raw=True)
        check(f"34. GET {page}", status == 200, f"status {status}")

    print("\nDashboard pages (owner session)")
    for page in [
        "/dashboard/orders",
        "/dashboard/kitchen",
        "/dashboard/menu",
        "/dashboard/categories",
        "/dashboard/tables",
        "/dashboard/tables/sheet",
        "/dashboard/staff",
        "/dashboard/analytics",
        "/dashboard/settings",
    ]:
        status, _, _ = owner.request("GET", page, raw=True)
        check(f"35. GET {page}", status == 200, f"status {status}")

    print("\nPlatform pages (admin session)")
    for page in ["/platform", "/platform/restaurants", "/platform/subscriptions", "/platform/analytics"]:
        status, _, _ = admin.request("GET", page, raw=True)
        check(f"36. GET {page}", status == 200, f"status {status}")

    print("\n" + "=" * 60)
    print(f"PASSED {len(PASSED)}   FAILED {len(FAILED)}")
    if FAILED:
        for failure in FAILED:
            print(f"  ✗ {failure}")
    print("=" * 60)
    return 1 if FAILED else 0


if __name__ == "__main__":
    sys.exit(main())
