import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_login_returns_token():
    async with AsyncClient(app=app, base_url='http://test') as ac:
        res = await ac.post('/login', params={'password': 'adminpassword'})
        assert res.status_code == 200
        data = res.json()
        assert 'access_token' in data
