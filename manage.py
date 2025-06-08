#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys

def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chatapp.settings')

    if len(sys.argv) > 1 and sys.argv[1] == "run_daphne":
        # Jalankan Daphne saat argumen `run_daphne` diberikan
        try:
            from daphne.cli import CommandLineInterface
        except ImportError as exc:
            raise ImportError(
                "Couldn't import Daphne. Make sure it's installed in your environment."
            ) from exc

        sys.argv = [sys.argv[0], "chatapp.asgi:application"]
        CommandLineInterface().run(sys.argv[1:])
        return

    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)

if __name__ == '__main__':
    main()
