from fastapi.testclient import TestClient

def test_read_main(client: TestClient):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "GTEK Open Campus API is running"}

def test_create_user(client: TestClient):
    response = client.post(
        "/api/v1/users/",
        json={"email": "testuser@example.com", "password": "testpassword", "role": "student"}
    )
    if response.status_code == 400:
        assert response.json() == {"detail": "Email already registered"}
    else:
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "testuser@example.com"
        assert "id" in data

def test_login(client: TestClient):
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "testuser@example.com", "password": "testpassword"}
    )
    assert response.status_code == 200
    assert "access_token" in response.json()
    assert response.json()["token_type"] == "bearer"
