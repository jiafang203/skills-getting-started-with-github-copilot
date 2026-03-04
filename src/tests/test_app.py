import pytest

from fastapi.testclient import TestClient

from src.app import app, activities


# Shared client instance across tests
client = TestClient(app)


def test_root_redirect():
    # Arrange: client ready
    # Act
    response = client.get("/", follow_redirects=False)
    # Assert
    assert response.status_code in (301, 302, 307, 308)
    assert response.headers["location"].endswith("/static/index.html")


def test_get_activities():
    # Arrange
    # Act
    response = client.get("/activities")
    # Assert
    assert response.status_code == 200
    assert response.json() == activities


def test_signup_for_activity_success():
    # Arrange
    activity = "Chess Club"
    email = "tester@example.com"
    if email in activities[activity]["participants"]:
        activities[activity]["participants"].remove(email)

    # Act
    response = client.post(
        f"/activities/{activity}/signup", params={"email": email}
    )

    # Assert
    assert response.status_code == 200
    assert email in activities[activity]["participants"]
    assert response.json()["message"] == f"Signed up {email} for {activity}"


def test_signup_for_activity_already_signed_up():
    # Arrange
    activity = "Chess Club"
    email = "duplicate@example.com"
    if email not in activities[activity]["participants"]:
        activities[activity]["participants"].append(email)

    # Act
    response = client.post(
        f"/activities/{activity}/signup", params={"email": email}
    )

    # Assert
    assert response.status_code == 400
    assert "already signed up" in response.json()["detail"].lower()


def test_signup_for_activity_not_found():
    # Arrange
    # Act
    response = client.post(
        "/activities/NoSuchActivity/signup", params={"email": "a@b.com"}
    )

    # Assert
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_unregister_success():
    # Arrange
    activity = "Chess Club"
    email = "remove@example.com"
    if email not in activities[activity]["participants"]:
        activities[activity]["participants"].append(email)

    # Act
    response = client.delete(
        f"/activities/{activity}/unregister", params={"email": email}
    )

    # Assert
    assert response.status_code == 200
    assert email not in activities[activity]["participants"]
    assert response.json()["message"] == f"Removed {email} from {activity}"


def test_unregister_not_signed_up():
    # Arrange
    activity = "Chess Club"
    email = "nobody@example.com"
    if email in activities[activity]["participants"]:
        activities[activity]["participants"].remove(email)

    # Act
    response = client.delete(
        f"/activities/{activity}/unregister", params={"email": email}
    )

    # Assert
    assert response.status_code == 400
    assert "not signed up" in response.json()["detail"].lower()


def test_unregister_activity_not_found():
    # Arrange
    # Act
    response = client.delete(
        "/activities/NoSuchActivity/unregister", params={"email": "a@b.com"}
    )

    # Assert
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_case_sensitivity_activity_name():
    # Arrange
    # Act
    response = client.post(
        "/activities/chess club/signup", params={"email": "x@y.com"}
    )

    # Assert
    assert response.status_code == 404
    assert response.json()["detail"] == "Activity not found"


def test_max_participants_not_enforced():
    # Arrange
    activity = "Tennis Club"
    maxp = activities[activity]["max_participants"]
    # Fill beyond max
    for i in range(maxp + 2):
        test_email = f"overflow{i}@example.com"
        if test_email not in activities[activity]["participants"]:
            activities[activity]["participants"].append(test_email)

    # Act
    response = client.post(
        f"/activities/{activity}/signup", params={"email": "exceed@example.com"}
    )

    # Assert
    assert response.status_code == 200
    assert "exceed@example.com" in activities[activity]["participants"]


def test_signup_then_fetch_shows_participant():
    # Arrange
    activity = "Gym Class"
    email = "stateful@example.com"
    if email in activities[activity]["participants"]:
        activities[activity]["participants"].remove(email)

    # Act - First signup
    signup_response = client.post(
        f"/activities/{activity}/signup", params={"email": email}
    )
    # Act - Then fetch activities
    fetch_response = client.get("/activities")

    # Assert
    assert signup_response.status_code == 200
    assert fetch_response.status_code == 200
    assert email in fetch_response.json()[activity]["participants"]


def test_unregister_then_fetch_removes_participant():
    # Arrange
    activity = "Basketball Team"
    email = "removed@example.com"
    if email not in activities[activity]["participants"]:
        activities[activity]["participants"].append(email)

    # Act - First unregister
    unregister_response = client.delete(
        f"/activities/{activity}/unregister", params={"email": email}
    )
    # Act - Then fetch activities
    fetch_response = client.get("/activities")

    # Assert
    assert unregister_response.status_code == 200
    assert fetch_response.status_code == 200
    assert email not in fetch_response.json()[activity]["participants"]
