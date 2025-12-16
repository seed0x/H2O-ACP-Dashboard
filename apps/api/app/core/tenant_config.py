"""
Tenant Configuration Module

Defines tenant capabilities and feature access rules.
This replaces hardcoded tenant ID checks throughout the codebase.
"""

from typing import Dict, List, Set
from enum import Enum


class TenantFeature(str, Enum):
    """Available features that tenants can have access to"""
    JOBS = "jobs"
    SERVICE_CALLS = "service_calls"
    BIDS = "bids"
    MARKETING = "marketing"


class TenantConfig:
    """Configuration for a tenant"""
    
    def __init__(self, tenant_id: str, name: str, features: List[TenantFeature]):
        self.tenant_id = tenant_id
        self.name = name
        self.features = set(features)
    
    def has_feature(self, feature: TenantFeature) -> bool:
        """Check if tenant has access to a feature"""
        return feature in self.features


# Tenant registry - defines which tenants have access to which features
TENANT_REGISTRY: Dict[str, TenantConfig] = {
    "all_county": TenantConfig(
        tenant_id="all_county",
        name="All County Plumbing",
        features=[TenantFeature.JOBS, TenantFeature.BIDS]
    ),
    "h2o": TenantConfig(
        tenant_id="h2o",
        name="H2O Plumbers",
        features=[TenantFeature.SERVICE_CALLS, TenantFeature.MARKETING]
    ),
}


def get_tenant_config(tenant_id: str) -> TenantConfig:
    """Get tenant configuration by ID"""
    config = TENANT_REGISTRY.get(tenant_id)
    if not config:
        raise ValueError(f"Unknown tenant_id: {tenant_id}")
    return config


def validate_tenant_feature(tenant_id: str, feature: TenantFeature) -> None:
    """
    Validate that a tenant has access to a feature.
    Raises ValueError if tenant doesn't have access.
    """
    config = get_tenant_config(tenant_id)
    if not config.has_feature(feature):
        raise ValueError(
            f"Tenant '{tenant_id}' does not have access to feature '{feature.value}'. "
            f"Available features: {[f.value for f in config.features]}"
        )


def get_tenants_with_feature(feature: TenantFeature) -> List[str]:
    """Get list of tenant IDs that have access to a feature"""
    return [
        tenant_id
        for tenant_id, config in TENANT_REGISTRY.items()
        if config.has_feature(feature)
    ]


def is_valid_tenant(tenant_id: str) -> bool:
    """Check if tenant_id is valid"""
    return tenant_id in TENANT_REGISTRY

