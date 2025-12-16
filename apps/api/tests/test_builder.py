import asyncio
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
# Database setup and admin user are now in conftest.py

@pytest.mark.asyncio
async def test_create_builder_and_unique_constraint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url='http://test') as ac:
        login = await ac.post('/api/v1/login', json={'username': 'admin', 'password': 'adminpassword'})
        token = login.json()['access_token']
        headers = {"Authorization": f"Bearer {token}"}
        res = await ac.post('/api/v1/builders', json={'name': 'Test Builder'}, headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data['name'] == 'Test Builder'

        # Try duplicate
        res2 = await ac.post('/api/v1/builders', json={'name': 'Test Builder'}, headers=headers)
        assert res2.status_code in (400, 409)
