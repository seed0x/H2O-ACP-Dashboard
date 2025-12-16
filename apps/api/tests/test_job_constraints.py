import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
# Database setup and admin user are now in conftest.py

@pytest.mark.asyncio
async def test_job_uniqueness():
    async with AsyncClient(transport=ASGITransport(app=app), base_url='http://test') as ac:
        # login
        login = await ac.post('/api/v1/login', json={'username': 'admin', 'password': 'adminpassword'})
        token = login.json()['access_token']
        headers = {"Authorization": f"Bearer {token}"}
        # create builder
        res = await ac.post('/api/v1/builders', json={'name': 'B1'}, headers=headers)
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
        res = await ac.post('/api/v1/jobs', json=job, headers=headers)
        assert res.status_code == 200
        # duplicate should 400/409
        res2 = await ac.post('/api/v1/jobs', json=job, headers=headers)
        assert res2.status_code in (400, 409)
