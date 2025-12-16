"""
Run all API tests and generate a report
"""
import subprocess
import sys
import os

def run_tests():
    """Run all pytest tests"""
    print("="*60)
    print("Running Comprehensive API Tests")
    print("="*60)
    print()
    
    # Change to API directory
    api_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(api_dir)
    
    # Run pytest with verbose output
    result = subprocess.run(
        [sys.executable, "-m", "pytest", "tests/", "-v", "--tb=short"],
        capture_output=False
    )
    
    print()
    print("="*60)
    if result.returncode == 0:
        print("[PASS] All tests passed!")
    else:
        print("[FAIL] Some tests failed. Check output above.")
    print("="*60)
    
    return result.returncode

if __name__ == "__main__":
    sys.exit(run_tests())

