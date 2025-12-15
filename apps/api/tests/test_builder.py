import asyncio
import pytest
from httpx import AsyncClient
from app.main import app
from app.db.session import engine
from app.models import Base

@pytest.fixture(scope='module', autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield

@pytest.mark.asyncio
async def test_create_builder_and_unique_constraint():
    async with AsyncClient(app=app, base_url='http://test') as ac:
        login = await ac.post('/login', params={'password': 'adminpassword'})
        token = login.json()['access_token']
        headers = {"Authorization": f"Bearer {token}"}
        res = await ac.post('/builders', json={'name': 'Test Builder'}, headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data['name'] == 'Test Builder'

        # Try duplicate
        res2 = await ac.post('/builders', json={'name': 'Test Builder'}, headers=headers)
        assert res2.status_code in (400, 409)
