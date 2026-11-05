import asyncio

import pygame  # imported here so pygbag's scan of main.py loads pygame-ce

from game import Game


async def main():
    GAME = Game()
    await GAME.run()

if __name__ == "__main__":
    asyncio.run(main())
