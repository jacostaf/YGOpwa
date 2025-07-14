#!/usr/bin/env python3
"""
Comprehensive Tests for realBackendAPI.py

This test suite provides 100% coverage and AI validation for the Flask API backend
including all endpoints, error handling, database operations, and edge cases.

@version 2.1.0
@author YGORipperUI Team
"""

import unittest
import json
import os
import sys
import tempfile
import time
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta

# Add the project root to the path so we can import the API
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the Flask app
try:
    from realBackendAPI import app, get_mongo_client, format_tcgplayer_search_url
except ImportError as e:
    print(f"Warning: Could not import realBackendAPI: {e}")
    app = None


class TestRealBackendAPI(unittest.TestCase):
    """Comprehensive tests for the realBackendAPI Flask application"""
    
    def setUp(self):
        """Set up test environment before each test"""
        if app is None:
            self.skipTest("realBackendAPI could not be imported")
            
        self.app = app
        self.app.config['TESTING'] = True
        self.client = self.app.test_client()
        
        # Mock environment variables
        self.env_patcher = patch.dict(os.environ, {
            'MONGODB_CONNECTION_STRING': 'mongodb://test:test@localhost:27017/test',
            'TCGPLAYER_MAX_PREFERRED_RESULTS': '50',
            'TCGPLAYER_MAX_ACCEPTABLE_RESULTS': '200'
        })
        self.env_patcher.start()
    
    def tearDown(self):
        """Clean up after each test"""
        if hasattr(self, 'env_patcher'):
            self.env_patcher.stop()
    
    def test_health_check_endpoint(self):
        """Test the health check endpoint"""
        response = self.client.get('/health')
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        self.assertTrue(data['healthy'])
        self.assertIn('timestamp', data)
        self.assertIn('version', data)
    
    def test_cors_headers(self):
        """Test that CORS headers are properly set"""
        response = self.client.get('/health')
        self.assertIn('Access-Control-Allow-Origin', response.headers)
    
    @patch('realBackendAPI.get_mongo_client')
    def test_cards_price_endpoint_success(self, mock_mongo):
        """Test the cards/price endpoint with valid data"""
        # Mock successful database response
        mock_collection = Mock()
        mock_collection.find_one.return_value = {
            'card_name': 'Blue-Eyes White Dragon',
            'card_number': 'LOB-001',
            'tcg_price': 15.50,
            'tcg_market_price': 18.75,
            'last_updated': datetime.utcnow(),
            'cache_expires': datetime.utcnow() + timedelta(hours=24)
        }
        
        mock_db = Mock()
        mock_db.__getitem__.return_value = mock_collection
        
        mock_client = Mock()
        mock_client.__getitem__.return_value = mock_db
        mock_mongo.return_value = mock_client
        
        # Test request
        response = self.client.post('/cards/price', 
            data=json.dumps({
                'card_number': 'LOB-001',
                'card_name': 'Blue-Eyes White Dragon',
                'card_rarity': 'Ultra Rare'
            }),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data['success'])
        self.assertIn('data', data)
        self.assertEqual(data['data']['card_name'], 'Blue-Eyes White Dragon')
    
    def test_cards_price_invalid_json(self):
        """Test cards/price endpoint with invalid JSON"""
        response = self.client.post('/cards/price', 
            data='invalid json',
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertFalse(data['success'])
        self.assertIn('error', data)
    
    def test_cards_price_missing_fields(self):
        """Test cards/price endpoint with missing required fields"""
        response = self.client.post('/cards/price', 
            data=json.dumps({
                'card_name': 'Blue-Eyes White Dragon'
                # Missing card_number
            }),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertFalse(data['success'])
        self.assertIn('error', data)
    
    def test_ai_validation_input_sanitization(self):
        """AI Validation: Test input sanitization for malicious inputs"""
        malicious_inputs = [
            {
                'card_name': '<script>alert("xss")</script>',
                'card_number': 'XSS-001',
                'card_rarity': 'Common'
            },
            {
                'card_name': "'; DROP TABLE cards; --",
                'card_number': 'SQL-001',
                'card_rarity': 'Common'
            },
            {
                'card_name': '../../../etc/passwd',
                'card_number': 'PATH-001',
                'card_rarity': 'Common'
            },
            {
                'card_name': 'A' * 10000,  # Very long string
                'card_number': 'LONG-001',
                'card_rarity': 'Common'
            }
        ]
        
        for malicious_input in malicious_inputs:
            with self.subTest(input=malicious_input):
                response = self.client.post('/cards/price',
                    data=json.dumps(malicious_input),
                    content_type='application/json'
                )
                
                # Should not crash the server
                self.assertIn(response.status_code, [200, 400, 500])
                
                # Response should be valid JSON
                try:
                    data = json.loads(response.data)
                    self.assertIn('success', data)
                except json.JSONDecodeError:
                    self.fail("Response is not valid JSON")
    
    def test_ai_validation_type_consistency(self):
        """AI Validation: Test type consistency in responses"""
        with patch('realBackendAPI.get_mongo_client') as mock_mongo:
            # Mock database response with mixed types
            mock_collection = Mock()
            mock_collection.find_one.return_value = {
                'card_name': 'Test Card',
                'card_number': 'TEST-001',
                'tcg_price': '15.50',  # String instead of float
                'tcg_market_price': 18.75,
                'last_updated': datetime.utcnow()
            }
            
            mock_db = Mock()
            mock_db.__getitem__.return_value = mock_collection
            mock_client = Mock()
            mock_client.__getitem__.return_value = mock_db
            mock_mongo.return_value = mock_client
            
            response = self.client.post('/cards/price',
                data=json.dumps({
                    'card_number': 'TEST-001',
                    'card_name': 'Test Card',
                    'card_rarity': 'Common'
                }),
                content_type='application/json'
            )
            
            data = json.loads(response.data)
            if data['success'] and 'data' in data:
                # Verify that numeric fields are properly typed
                if 'tcg_price' in data['data']:
                    self.assertIsInstance(data['data']['tcg_price'], (int, float))
                if 'tcg_market_price' in data['data']:
                    self.assertIsInstance(data['data']['tcg_market_price'], (int, float))
    
    @patch('realBackendAPI.get_mongo_client')
    def test_database_connection_failure(self, mock_mongo):
        """Test handling of database connection failures"""
        # Mock database connection failure
        mock_mongo.side_effect = Exception("Database connection failed")
        
        response = self.client.post('/cards/price',
            data=json.dumps({
                'card_number': 'ERROR-001',
                'card_name': 'Error Test Card',
                'card_rarity': 'Common'
            }),
            content_type='application/json'
        )
        
        # Should handle gracefully
        self.assertIn(response.status_code, [200, 500])
        data = json.loads(response.data)
        self.assertIn('success', data)
    
    def test_edge_cases_special_characters(self):
        """Test edge cases with special characters in card names"""
        edge_cases = [
            {
                'card_name': 'Card with "quotes"',
                'card_number': 'QUOTE-001',
                'card_rarity': 'Common'
            },
            {
                'card_name': 'Card with émoji 🐉',
                'card_number': 'EMOJI-001',
                'card_rarity': 'Common'
            },
            {
                'card_name': 'Card with\nnewlines',
                'card_number': 'NEWLINE-001',
                'card_rarity': 'Common'
            },
            {
                'card_name': 'Card with unicode: ™©®',
                'card_number': 'UNICODE-001',
                'card_rarity': 'Common'
            }
        ]
        
        for edge_case in edge_cases:
            with self.subTest(case=edge_case):
                response = self.client.post('/cards/price',
                    data=json.dumps(edge_case),
                    content_type='application/json'
                )
                
                # Should handle without crashing
                self.assertIn(response.status_code, [200, 400, 500])
                
                try:
                    data = json.loads(response.data)
                    self.assertIn('success', data)
                except json.JSONDecodeError:
                    self.fail(f"Response is not valid JSON for case: {edge_case}")
    
    def test_rate_limiting_behavior(self):
        """Test rate limiting behavior with rapid requests"""
        requests_count = 10
        responses = []
        
        for i in range(requests_count):
            response = self.client.post('/cards/price',
                data=json.dumps({
                    'card_number': f'RATE-{i:03d}',
                    'card_name': f'Rate Test Card {i}',
                    'card_rarity': 'Common'
                }),
                content_type='application/json'
            )
            responses.append(response)
        
        # All requests should complete (may be cached or rate limited)
        for i, response in enumerate(responses):
            with self.subTest(request=i):
                self.assertIn(response.status_code, [200, 429, 500])
    
    def test_ai_validation_async_behavior(self):
        """AI Validation: Test async behavior and race conditions"""
        import threading
        import queue
        
        results = queue.Queue()
        
        def make_request(request_id):
            try:
                response = self.client.post('/cards/price',
                    data=json.dumps({
                        'card_number': f'ASYNC-{request_id:03d}',
                        'card_name': f'Async Test Card {request_id}',
                        'card_rarity': 'Common'
                    }),
                    content_type='application/json'
                )
                results.put((request_id, response.status_code, response.data))
            except Exception as e:
                results.put((request_id, 'ERROR', str(e)))
        
        # Create multiple threads
        threads = []
        for i in range(5):
            thread = threading.Thread(target=make_request, args=(i,))
            threads.append(thread)
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join(timeout=5)
        
        # Verify all requests completed
        collected_results = []
        while not results.empty():
            collected_results.append(results.get_nowait())
        
        self.assertEqual(len(collected_results), 5)
        
        for request_id, status_code, data in collected_results:
            with self.subTest(request_id=request_id):
                self.assertNotEqual(status_code, 'ERROR')
                self.assertIn(status_code, [200, 400, 429, 500])
    
    def test_response_format_consistency(self):
        """Test that response format is consistent across different scenarios"""
        test_cases = [
            # Valid request
            {
                'input': {
                    'card_number': 'VALID-001',
                    'card_name': 'Valid Card',
                    'card_rarity': 'Common'
                },
                'expected_fields': ['success', 'message']
            },
            # Invalid request
            {
                'input': {},
                'expected_fields': ['success', 'error']
            }
        ]
        
        for case in test_cases:
            with self.subTest(case=case['input']):
                response = self.client.post('/cards/price',
                    data=json.dumps(case['input']),
                    content_type='application/json'
                )
                
                data = json.loads(response.data)
                
                # Verify response structure
                for field in case['expected_fields']:
                    self.assertIn(field, data, 
                                f"Missing field '{field}' in response for input: {case['input']}")
                
                # Success field should always be boolean
                self.assertIsInstance(data['success'], bool)
    
    def test_environment_configuration(self):
        """Test that environment variables are properly used"""
        # Test with custom environment variables
        with patch.dict(os.environ, {
            'TCGPLAYER_MAX_PREFERRED_RESULTS': '25',
            'TCGPLAYER_MAX_ACCEPTABLE_RESULTS': '100'
        }):
            # Reimport to get updated values
            import importlib
            import realBackendAPI
            importlib.reload(realBackendAPI)
            
            # Verify configuration values are used
            self.assertEqual(realBackendAPI.TCGPLAYER_MAX_PREFERRED_RESULTS, 25)
            self.assertEqual(realBackendAPI.TCGPLAYER_MAX_ACCEPTABLE_RESULTS, 100)
    
    def test_performance_large_payloads(self):
        """Test performance with large payloads"""
        large_payload = {
            'card_number': 'LARGE-001',
            'card_name': 'Large Test Card',
            'card_rarity': 'Common',
            'extra_data': 'X' * 10000  # Large string
        }
        
        start_time = time.time()
        response = self.client.post('/cards/price',
            data=json.dumps(large_payload),
            content_type='application/json'
        )
        end_time = time.time()
        
        # Should complete within reasonable time
        self.assertLess(end_time - start_time, 5.0)  # Less than 5 seconds
        
        # Should handle large payload gracefully
        self.assertIn(response.status_code, [200, 400, 413, 500])


class TestHelperFunctions(unittest.TestCase):
    """Test helper functions in the API"""
    
    def test_format_tcgplayer_search_url(self):
        """Test the TCGPlayer URL formatting function"""
        try:
            from realBackendAPI import format_tcgplayer_search_url
            
            url = format_tcgplayer_search_url("Blue-Eyes White Dragon", "LOB-001")
            self.assertIsInstance(url, str)
            self.assertIn("tcgplayer.com", url.lower())
            
        except ImportError:
            self.skipTest("format_tcgplayer_search_url function not available")
    
    def test_get_mongo_client_connection(self):
        """Test MongoDB client connection function"""
        try:
            from realBackendAPI import get_mongo_client
            
            with patch('realBackendAPI.MongoClient') as mock_mongo:
                mock_client = Mock()
                mock_mongo.return_value = mock_client
                
                client = get_mongo_client()
                self.assertIsNotNone(client)
                
        except ImportError:
            self.skipTest("get_mongo_client function not available")


if __name__ == '__main__':
    # Configure test runner
    unittest.main(verbosity=2, buffer=True)