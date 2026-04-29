def test_app_module_imports_successfully() -> None:
    from app.main import app

    assert app is not None
