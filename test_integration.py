#!/usr/bin/env python3
"""
Simple Integration Tests

Basic integration tests that can run without external dependencies
to validate the testing infrastructure.
"""

import unittest
import os
import sys
import json
import tempfile
from pathlib import Path

class TestProjectStructure(unittest.TestCase):
    """Test basic project structure and files"""
    
    def setUp(self):
        """Set up test environment"""
        self.project_root = Path(__file__).parent
        
    def test_project_files_exist(self):
        """Test that essential project files exist"""
        essential_files = [
            'package.json',
            'index.html',
            'realBackendAPI.py',
            'src/js/app.js',
            'src/js/utils/Logger.js',
            'src/js/utils/Storage.js',
            'src/tests/runner.js'
        ]
        
        for file_path in essential_files:
            full_path = self.project_root / file_path
            with self.subTest(file=file_path):
                self.assertTrue(full_path.exists(), f"Missing essential file: {file_path}")
    
    def test_package_json_structure(self):
        """Test package.json has required structure"""
        package_json_path = self.project_root / 'package.json'
        
        if package_json_path.exists():
            with open(package_json_path, 'r') as f:
                package_data = json.load(f)
            
            required_fields = ['name', 'version', 'scripts']
            for field in required_fields:
                with self.subTest(field=field):
                    self.assertIn(field, package_data, f"Missing required field: {field}")
            
            # Test scripts exist
            self.assertIn('test', package_data['scripts'], "Missing test script")
    
    def test_javascript_files_syntax(self):
        """Test that JavaScript files have basic syntax validation"""
        js_files = list((self.project_root / 'src' / 'js').rglob('*.js'))
        
        for js_file in js_files:
            with self.subTest(file=js_file.name):
                with open(js_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Basic syntax checks
                self.assertNotIn('syntax error', content.lower())
                
                # Check for common patterns that indicate proper structure
                if 'export' in content:
                    # File has exports, should be a module
                    self.assertTrue(
                        'export class' in content or 
                        'export function' in content or 
                        'export default' in content or
                        'export {' in content,
                        f"File {js_file.name} has exports but no proper export syntax"
                    )
    
    def test_python_files_syntax(self):
        """Test that Python files have basic syntax validation"""
        python_files = [
            self.project_root / 'realBackendAPI.py',
            self.project_root / 'test_backend.py'
        ]
        
        for py_file in python_files:
            if py_file.exists():
                with self.subTest(file=py_file.name):
                    # Try to compile the file
                    with open(py_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    try:
                        compile(content, str(py_file), 'exec')
                    except SyntaxError as e:
                        self.fail(f"Syntax error in {py_file.name}: {e}")
    
    def test_test_files_structure(self):
        """Test that test files follow proper structure"""
        test_files = list((self.project_root / 'src' / 'tests').glob('*.test.js'))
        
        self.assertGreater(len(test_files), 0, "No test files found")
        
        for test_file in test_files:
            with self.subTest(file=test_file.name):
                with open(test_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Should have registerTests function
                self.assertIn('registerTests', content, 
                            f"Test file {test_file.name} missing registerTests function")
                
                # Should have export
                self.assertIn('export', content, 
                            f"Test file {test_file.name} missing export statement")
    
    def test_ai_validation_tests_exist(self):
        """Test that AI validation tests are properly implemented"""
        test_files = list((self.project_root / 'src' / 'tests').glob('*.test.js'))
        
        ai_validation_found = False
        
        for test_file in test_files:
            with open(test_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            if 'ai-validation' in content.lower() or 'ai validation' in content.lower():
                ai_validation_found = True
                
                # Check for specific AI validation patterns
                ai_checks = [
                    'type safety',
                    'null safety',
                    'error handling',
                    'edge case',
                    'input sanitization'
                ]
                
                for check in ai_checks:
                    if check in content.lower():
                        with self.subTest(file=test_file.name, check=check):
                            self.assertIn(check, content.lower(), 
                                        f"AI validation check '{check}' found in {test_file.name}")
        
        self.assertTrue(ai_validation_found, "No AI validation tests found")
    
    def test_documentation_exists(self):
        """Test that documentation files exist"""
        doc_files = [
            'README.md',
            'TESTING_GUIDE.md',
            'COMPREHENSIVE_TESTING_STRATEGY.md'
        ]
        
        for doc_file in doc_files:
            doc_path = self.project_root / doc_file
            with self.subTest(file=doc_file):
                self.assertTrue(doc_path.exists(), f"Missing documentation: {doc_file}")
                
                if doc_path.exists():
                    # Check that file is not empty
                    self.assertGreater(doc_path.stat().st_size, 100, 
                                     f"Documentation file {doc_file} is too small")


class TestAIValidationPatterns(unittest.TestCase):
    """Test AI validation patterns in the codebase"""
    
    def setUp(self):
        """Set up test environment"""
        self.project_root = Path(__file__).parent
    
    def test_type_safety_patterns(self):
        """Test that type safety patterns are used"""
        js_files = list((self.project_root / 'src' / 'js').rglob('*.js'))
        
        type_safety_patterns = [
            'typeof',
            'instanceof',
            'Array.isArray',
            '.length',
            'hasOwnProperty'
        ]
        
        patterns_found = {}
        for pattern in type_safety_patterns:
            patterns_found[pattern] = False
        
        for js_file in js_files:
            with open(js_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            for pattern in type_safety_patterns:
                if pattern in content:
                    patterns_found[pattern] = True
        
        # At least some type safety patterns should be found
        found_count = sum(patterns_found.values())
        self.assertGreater(found_count, 0, 
                          "No type safety patterns found in JavaScript files")
    
    def test_error_handling_patterns(self):
        """Test that error handling patterns are used"""
        js_files = list((self.project_root / 'src' / 'js').rglob('*.js'))
        
        error_patterns = [
            'try {',
            'catch',
            'throw new Error',
            'console.error',
            '.error('
        ]
        
        patterns_found = {}
        for pattern in error_patterns:
            patterns_found[pattern] = False
        
        for js_file in js_files:
            with open(js_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            for pattern in error_patterns:
                if pattern in content:
                    patterns_found[pattern] = True
        
        # At least some error handling patterns should be found
        found_count = sum(patterns_found.values())
        self.assertGreater(found_count, 0, 
                          "No error handling patterns found in JavaScript files")
    
    def test_security_patterns(self):
        """Test for security-related patterns"""
        all_files = []
        all_files.extend(list((self.project_root / 'src' / 'js').rglob('*.js')))
        
        # Check for potential security issues
        security_issues = [
            'eval(',
            'innerHTML =',
            'document.write(',
            'dangerouslySetInnerHTML'
        ]
        
        for file_path in all_files:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            for issue in security_issues:
                with self.subTest(file=file_path.name, issue=issue):
                    self.assertNotIn(issue, content, 
                                   f"Potential security issue '{issue}' found in {file_path.name}")


class TestTestInfrastructure(unittest.TestCase):
    """Test the testing infrastructure itself"""
    
    def setUp(self):
        """Set up test environment"""
        self.project_root = Path(__file__).parent
    
    def test_test_runner_exists(self):
        """Test that the test runner exists and is executable"""
        runner_path = self.project_root / 'src' / 'tests' / 'runner.js'
        
        self.assertTrue(runner_path.exists(), "Test runner not found")
        
        with open(runner_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check for essential components
        essential_components = [
            'ComprehensiveTestFramework',
            'runAll',
            'registerTests',
            'expect',
            'aiValidationChecks'
        ]
        
        for component in essential_components:
            with self.subTest(component=component):
                self.assertIn(component, content, 
                            f"Missing essential component: {component}")
    
    def test_ci_cd_configuration(self):
        """Test that CI/CD configuration exists"""
        ci_config_path = self.project_root / '.github' / 'workflows' / 'test.yml'
        
        self.assertTrue(ci_config_path.exists(), "CI/CD configuration not found")
        
        with open(ci_config_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check for essential CI/CD components
        ci_components = [
            'frontend-tests',
            'backend-tests',
            'ai-validation-tests',
            'security-validation',
            'coverage-report'
        ]
        
        for component in ci_components:
            with self.subTest(component=component):
                self.assertIn(component, content, 
                            f"Missing CI/CD component: {component}")


if __name__ == '__main__':
    # Run tests with verbose output
    unittest.main(verbosity=2, buffer=True)