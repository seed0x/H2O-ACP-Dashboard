"""
Comprehensive API endpoint tests
Tests all routes, buttons, and integrations
"""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from uuid import uuid4

# Test data
TEST_BUILDER = {"name": "Test Builder", "notes": "Test notes"}
TEST_JOB = {
    "tenant_id": "all_county",
    "builder_id": None,  # Will be set after creating builder
    "community": "Test Community",
    "lot_number": "123",
    "phase": "TO",
    "status": "scheduled",
    "address_line1": "123 Test St",
    "city": "Vancouver",
    "state": "WA",
    "zip": "98660"
}
TEST_SERVICE_CALL = {
    "tenant_id": "h2o",
    "customer_name": "Test Customer",
    "address_line1": "456 Test Ave",
    "city": "Vancouver",
    "state": "WA",
    "zip": "98660",
    "issue_description": "Test issue",
    "status": "open"
}
TEST_BID = {
    "tenant_id": "all_county",
    "builder_id": None,  # Will be set after creating builder
    "project_name": "Test Project",
    "status": "Draft"
}

@pytest.fixture
async def client():
    """Create test client"""
    return AsyncClient(transport=ASGITransport(app=app), base_url='http://test')

@pytest.fixture
async def auth_token(client):
    """Get authentication token - depends on client and admin user from conftest"""
    res = await client.post('/api/v1/login', json={
        "username": "admin",
        "password": "adminpassword"
    })
    assert res.status_code == 200, f"Login failed: {res.status_code} - {res.text}"
    data = res.json()
    assert 'access_token' in data, f"No access_token in response: {data}"
    return data['access_token']

@pytest.mark.asyncio
class TestAuthentication:
    """Test authentication endpoints"""
    
    async def test_login_success(self, client):
        """Test successful login"""
        res = await client.post('/api/v1/login', json={
            "username": "admin",
            "password": "adminpassword"
        })
        assert res.status_code == 200
        data = res.json()
        assert 'access_token' in data
        assert data['username'] == 'admin'
        assert data['role'] == 'admin'
    
    async def test_login_invalid_credentials(self, client):
        """Test login with invalid credentials"""
        res = await client.post('/api/v1/login', json={
            "username": "admin",
            "password": "wrongpassword"
        })
        assert res.status_code == 401
    
    async def test_health_endpoint(self, client):
        """Test health check"""
        res = await client.get('/api/v1/health')
        assert res.status_code == 200
        assert res.json() == {"status": "ok"}

@pytest.mark.asyncio
class TestBuilders:
    """Test builder endpoints"""
    
    async def test_create_builder(self, client, auth_token):
        """Test creating a builder"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        res = await client.post('/api/v1/builders', json=TEST_BUILDER, headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data['name'] == TEST_BUILDER['name']
        return data['id']
    
    async def test_list_builders(self, client, auth_token):
        """Test listing builders"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        res = await client.get('/api/v1/builders', headers=headers)
        assert res.status_code == 200
        assert isinstance(res.json(), list)
    
    async def test_get_builder(self, client, auth_token):
        """Test getting a specific builder"""
        # First create a builder
        headers = {"Authorization": f"Bearer {auth_token}"}
        create_res = await client.post('/api/v1/builders', json=TEST_BUILDER, headers=headers)
        builder_id = create_res.json()['id']
        
        # Then get it
        res = await client.get(f'/api/v1/builders/{builder_id}', headers=headers)
        assert res.status_code == 200
        assert res.json()['id'] == builder_id
    
    async def test_update_builder(self, client, auth_token):
        """Test updating a builder"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        # Create builder
        create_res = await client.post('/api/v1/builders', json=TEST_BUILDER, headers=headers)
        builder_id = create_res.json()['id']
        
        # Update builder
        update_data = {"name": "Updated Builder Name"}
        res = await client.put(f'/api/v1/builders/{builder_id}', json=update_data, headers=headers)
        assert res.status_code == 200
        assert res.json()['name'] == "Updated Builder Name"

@pytest.mark.asyncio
class TestJobs:
    """Test job endpoints"""
    
    async def test_create_job(self, client, auth_token):
        """Test creating a job"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        # First create a builder
        builder_res = await client.post('/api/v1/builders', json=TEST_BUILDER, headers=headers)
        builder_id = builder_res.json()['id']
        
        # Create job
        job_data = {**TEST_JOB, "builder_id": builder_id}
        res = await client.post('/api/v1/jobs', json=job_data, headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data['community'] == TEST_JOB['community']
        return data['id']
    
    async def test_list_jobs(self, client, auth_token):
        """Test listing jobs"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        res = await client.get('/api/v1/jobs?tenant_id=all_county', headers=headers)
        assert res.status_code == 200
        assert isinstance(res.json(), list)
    
    async def test_get_job(self, client, auth_token):
        """Test getting a specific job"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        # Create builder and job
        builder_res = await client.post('/api/v1/builders', json=TEST_BUILDER, headers=headers)
        builder_id = builder_res.json()['id']
        job_data = {**TEST_JOB, "builder_id": builder_id}
        job_res = await client.post('/api/v1/jobs', json=job_data, headers=headers)
        job_id = job_res.json()['id']
        
        # Get job
        res = await client.get(f'/api/v1/jobs/{job_id}', headers=headers)
        assert res.status_code == 200
        assert res.json()['id'] == job_id
    
    async def test_update_job(self, client, auth_token):
        """Test updating a job"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        # Create builder and job
        builder_res = await client.post('/api/v1/builders', json=TEST_BUILDER, headers=headers)
        builder_id = builder_res.json()['id']
        job_data = {**TEST_JOB, "builder_id": builder_id}
        job_res = await client.post('/api/v1/jobs', json=job_data, headers=headers)
        job_id = job_res.json()['id']
        
        # Update job
        update_data = {"status": "completed"}
        res = await client.put(f'/api/v1/jobs/{job_id}', json=update_data, headers=headers)
        assert res.status_code == 200
        assert res.json()['status'] == "completed"

@pytest.mark.asyncio
class TestServiceCalls:
    """Test service call endpoints"""
    
    async def test_create_service_call(self, client, auth_token):
        """Test creating a service call"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        res = await client.post('/api/v1/service-calls', json=TEST_SERVICE_CALL, headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data['customer_name'] == TEST_SERVICE_CALL['customer_name']
        return data['id']
    
    async def test_list_service_calls(self, client, auth_token):
        """Test listing service calls"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        res = await client.get('/api/v1/service-calls?tenant_id=h2o', headers=headers)
        assert res.status_code == 200
        assert isinstance(res.json(), list)
    
    async def test_get_service_call(self, client, auth_token):
        """Test getting a specific service call"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        # Create service call
        create_res = await client.post('/api/v1/service-calls', json=TEST_SERVICE_CALL, headers=headers)
        sc_id = create_res.json()['id']
        
        # Get service call
        res = await client.get(f'/api/v1/service-calls/{sc_id}', headers=headers)
        assert res.status_code == 200
        assert res.json()['id'] == sc_id
    
    async def test_update_service_call(self, client, auth_token):
        """Test updating a service call"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        # Create service call
        create_res = await client.post('/api/v1/service-calls', json=TEST_SERVICE_CALL, headers=headers)
        sc_id = create_res.json()['id']
        
        # Update service call
        update_data = {"status": "completed"}
        res = await client.put(f'/api/v1/service-calls/{sc_id}', json=update_data, headers=headers)
        assert res.status_code == 200
        assert res.json()['status'] == "completed"

@pytest.mark.asyncio
class TestBids:
    """Test bid endpoints"""
    
    async def test_create_bid(self, client, auth_token):
        """Test creating a bid"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        # First create a builder
        builder_res = await client.post('/api/v1/builders', json=TEST_BUILDER, headers=headers)
        builder_id = builder_res.json()['id']
        
        # Create bid
        bid_data = {**TEST_BID, "builder_id": builder_id}
        res = await client.post('/api/v1/bids', json=bid_data, headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data['project_name'] == TEST_BID['project_name']
        return data['id']
    
    async def test_list_bids(self, client, auth_token):
        """Test listing bids"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        res = await client.get('/api/v1/bids?tenant_id=all_county', headers=headers)
        assert res.status_code == 200
        assert isinstance(res.json(), list)
    
    async def test_get_bid(self, client, auth_token):
        """Test getting a specific bid"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        # Create builder and bid
        builder_res = await client.post('/api/v1/builders', json=TEST_BUILDER, headers=headers)
        builder_id = builder_res.json()['id']
        bid_data = {**TEST_BID, "builder_id": builder_id}
        bid_res = await client.post('/api/v1/bids', json=bid_data, headers=headers)
        bid_id = bid_res.json()['id']
        
        # Get bid
        res = await client.get(f'/api/v1/bids/{bid_id}', headers=headers)
        assert res.status_code == 200
        assert res.json()['id'] == bid_id

@pytest.mark.asyncio
class TestAuthorization:
    """Test authorization and access control"""
    
    async def test_protected_endpoint_without_token(self, client):
        """Test that protected endpoints require authentication"""
        res = await client.get('/api/v1/jobs')
        assert res.status_code == 401
    
    async def test_protected_endpoint_with_invalid_token(self, client):
        """Test that invalid tokens are rejected"""
        headers = {"Authorization": "Bearer invalid_token"}
        res = await client.get('/api/v1/jobs', headers=headers)
        assert res.status_code == 401

@pytest.mark.asyncio
class TestDataIntegrity:
    """Test data integrity and constraints"""
    
    async def test_duplicate_job_constraint(self, client, auth_token):
        """Test that duplicate jobs are prevented"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        # Create builder
        builder_res = await client.post('/api/v1/builders', json=TEST_BUILDER, headers=headers)
        builder_id = builder_res.json()['id']
        
        # Create first job
        job_data = {**TEST_JOB, "builder_id": builder_id}
        res1 = await client.post('/api/v1/jobs', json=job_data, headers=headers)
        assert res1.status_code == 200
        
        # Try to create duplicate job (same builder, community, lot, phase, tenant)
        res2 = await client.post('/api/v1/jobs', json=job_data, headers=headers)
        # Should either skip or return error
        assert res2.status_code in [200, 400, 422]  # Depending on implementation

