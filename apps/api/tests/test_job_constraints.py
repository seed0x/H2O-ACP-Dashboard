import pytest
from app.db.session import engine
from app.models import Base
from httpx import AsyncClient
from app.main import app

@pytest.fixture(scope='module', autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield

@pytest.mark.asyncio
async def test_job_uniqueness():
    async with AsyncClient(app=app, base_url='http://test') as ac:
        # login
        login = await ac.post('/login', params={'password': 'adminpassword'})
        token = login.json()['access_token']
        headers = {"Authorization": f"Bearer {token}"}
        # create builder
        res = await ac.post('/builders', json={'name': 'B1'}, headers=headers)
        assert res.status_code == 200
        builder = res.json()
        # create job
        job = {
            'tenant_id': 'all_county',
            'builder_id': builder['id'],
            'community': 'C',
            'lot_number': '1',
            'phase': 'rough',
            'status': 'Pending',
            'address_line1': '1 Road St',
            'city': 'City',
            'zip': '98000'
        }
        res = await ac.post('/jobs', json=job, headers=headers)
        assert res.status_code == 200
        # duplicate should 400/409
        res2 = await ac.post('/jobs', json=job, headers=headers)
        assert res2.status_code in (400, 409)
