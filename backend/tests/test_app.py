from fastapi.testclient import TestClient

from backend.app.main import app


client = TestClient(app)


def test_health_check():
    response = client.get('/health')
    assert response.status_code == 200
    assert response.json()['status'] == 'ok'


def test_chat_endpoint_returns_text():
    response = client.post(
        '/api/chat',
        json={
            'message': 'What should I study today?',
            'language': 'en',
            'state': {'tasks': [], 'exams': [], 'courses': [], 'attendance': []},
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert 'text' in payload
    assert isinstance(payload['text'], str)
    assert payload['text']


def test_unsupported_provider_is_rejected():
    response = client.post(
        '/api/chat',
        json={
            'message': 'What should I study today?',
            'provider': 'openai',
        },
    )
    assert response.status_code == 400
    payload = response.json()
    assert payload['detail']['error_code'] == 'validation_failed'
    assert payload['detail']['msg'] == 'Unsupported provider: provider is not enabled'
