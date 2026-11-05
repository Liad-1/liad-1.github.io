import json
import sys

from globals import SETTINGS


class Client:
    """Browser build: there is no server socket or terminal input in a web page,
    so only the settings saving of the original Client is kept."""

    def __init__(self) -> None:
        self.id: int = None
        self.settings_saved = False

    def set_settings(self):
        """Stores the current settings in the browser's localStorage. The page
        reloads when the game loop ends so they take effect (the original wrote
        settings.json and closed the window)."""
        self.settings_saved = True
        if sys.platform == "emscripten":
            import platform
            platform.window.localStorage.setItem("minesweeper-settings", json.dumps(SETTINGS))
