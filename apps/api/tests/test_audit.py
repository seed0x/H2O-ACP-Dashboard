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
async def test_audit_on_update():
    async with AsyncClient(app=app, base_url='http://test') as ac:
        login = await ac.post('/login', params={'password': 'adminpassword'})
        token = login.json()['access_token']
        headers = {"Authorization": f"Bearer {token}"}
        res = await ac.post('/builders', json={'name': 'AuditBuilder', 'notes': 'old'}, headers=headers)
        assert res.status_code == 200
        b = res.json()
        res2 = await ac.patch(f"/builders/{b['id']}", json={'notes': 'new'}, headers=headers)
        assert res2.status_code == 200
        # check audit
        res3 = await ac.get('/audit', params={'entity_type': 'builder', 'entity_id': b['id']})
        assert res3.status_code == 200
        logs = res3.json()
        assert any(l['action'] == 'update' for l in logs)
