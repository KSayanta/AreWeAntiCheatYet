import fs from 'fs/promises';
import { Game } from '../src/types/games';

const gamesFile = './games.json';
const jsonsDir = './public/assets/jsons/';

(async () => {
  const db = await fs.readFile(gamesFile, 'utf8');
  const games: Game[] = JSON.parse(db);

  try {
    const files = await fs.readdir(jsonsDir);
    if (files.length === 0) throw Error(`ERR: no jsons in ${jsonsDir}`, { cause: 'NOFILE' });

    let newGames: Game[] = games;

    for (const file in files) {
      const fileContent = await fs.readFile(`${jsonsDir}${files[file]}`, 'utf-8');
      const gameJson = JSON.parse(fileContent) as Game;
      const game = games.find((game) => game.name === gameJson.name);

      if (!game) newGames.push(gameJson);
      else newGames = newGames.map((g) => (g.name === game.name ? gameJson : g));
    }

    await fs.writeFile(gamesFile, JSON.stringify(newGames, null, 2), { encoding: 'utf8' });
  } catch (err) {
    if (err instanceof Error) {
      if ('code' in err && err.code === 'ENOENT') {
        console.error(`ERR: ${jsonsDir} directory does not exist.`);
      }
      if (err.cause === 'NOFILE') {
        console.error(err.message);
      }
    }
  }
})();
