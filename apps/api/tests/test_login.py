import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_login_returns_token():
    """Test login returns token - uses admin user from conftest"""
    async with AsyncClient(transport=ASGITransport(app=app), base_url='http://test') as ac:
        res = await ac.post('/api/v1/login', json={'username': 'admin', 'password': 'adminpassword'})
        assert res.status_code == 200, f"Login failed: {res.status_code} - {res.text}"
        data = res.json()
        assert 'access_token' in data, f"No access_token in response: {data}"
