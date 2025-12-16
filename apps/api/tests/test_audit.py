import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
# Database setup and admin user are now in conftest.py

@pytest.mark.asyncio
async def test_audit_on_update():
    async with AsyncClient(transport=ASGITransport(app=app), base_url='http://test') as ac:
        login = await ac.post('/api/v1/login', json={'username': 'admin', 'password': 'adminpassword'})
        token = login.json()['access_token']
        headers = {"Authorization": f"Bearer {token}"}
        res = await ac.post('/api/v1/builders', json={'name': 'AuditBuilder', 'notes': 'old'}, headers=headers)
        assert res.status_code == 200
        b = res.json()
        res2 = await ac.put(f"/api/v1/builders/{b['id']}", json={'notes': 'new'}, headers=headers)
        assert res2.status_code == 200
        # check audit
        res3 = await ac.get('/api/v1/audit', params={'entity_type': 'builder', 'entity_id': b['id']}, headers=headers)
        assert res3.status_code == 200
        logs = res3.json()
        assert any(l['action'] == 'update' for l in logs)
