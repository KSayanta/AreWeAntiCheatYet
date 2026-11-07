import fs from 'fs/promises';
import path from 'path';
import { markdownToMdast } from 'satteri';
import type { Game, Status, StoreIds } from '../src/types/games';

type MdSection = Record<string, string>;
type EntryLabels = {
  game: string;
  gameUrl: string;
  antiCheatSoftware: string;
  antiCheatOther: string;
  antiCheatStatus: string;
  tinkeringSteps: string;
  antiCheatProof: string;
  additionalComments: string;
  updateTitle: string;
  notes: string;
  noteRefs: string;
  steamId: string;
  epicId: string;
};

const issuesDir = './public/assets/issues/';
const targetDirPath = './public/assets/jsons/';

const headingLabels: EntryLabels = {
  game: 'Game title',
  gameUrl: 'Game main page',
  antiCheatSoftware: 'Anti-cheat software',
  antiCheatOther: 'Anti-cheat name',
  antiCheatStatus: 'Status of the game anti-cheat',
  tinkeringSteps: 'Tinkering steps',
  antiCheatProof: 'Proof of mention',
  additionalComments: 'Additional comments',
  updateTitle: 'Update title',
  notes: 'Notes',
  noteRefs: 'Note refs',
  steamId: 'Steam id',
  epicId: 'Epic id', // namespace/slug
};

function slugify(source: string): string {
  return source
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function extractStatus(status: string): Status {
  return status.trim().slice(3) as Status;
  // return status.replaceAll(/[\u{1F300}-\u{1F9FF}]/gu, '').trim() as Status;
}

function getAntiCheats(sections: MdSection): string[] {
  return sections[headingLabels.antiCheatSoftware]?.includes('Other')
    ? [sections[headingLabels.antiCheatOther]]
    : [sections[headingLabels.antiCheatSoftware]];
}

function getNotes(sections: MdSection): [text: string, ref: string][] | undefined {
  if (!sections[headingLabels.notes]) return undefined;
  return [[sections[headingLabels.notes], sections[headingLabels.noteRefs] || null]];
}

function getStoreId(sections: MdSection, storeId?: StoreIds): StoreIds {
  const newStoreId: StoreIds = storeId || {};
  const steam = sections[headingLabels.steamId];
  const epic = sections[headingLabels.epicId];

  if (steam) {
    newStoreId.steam = steam;
  }

  if (epic) {
    const [namespace, slug] = epic.split('/').map((s) => s.trim());
    newStoreId.epic = { namespace, slug };
  }

  return newStoreId;
}

async function processMd(games: Game[], filename: string) {
  const issueId = path.basename(filename, path.extname(filename));
  const fileContent = await fs.readFile(filename, 'utf-8');
  const tree = markdownToMdast(fileContent);
  const sections: MdSection = {};

  console.log(`INFO: Processing ${filename}`);

  if (tree.type === 'root') {
    let key = '';
    let value = [''];

    for (let idx = 0; idx < tree.children.length; idx++) {
      const rootChild = tree.children[idx];
      if (rootChild.type === 'heading') {
        if (rootChild.children[0].type === 'text') key = rootChild.children[0].value;
        value = [];
      } else if (rootChild.type === 'paragraph') {
        rootChild.children.forEach((child) => {
          if (child.type === 'text') {
            value.push(child.value);
          } else if (child.type === 'link') {
            value.push(child.url);
          }
        });
      }
      sections[key] = value.join(' ');
    }
  }

  let new_game: Game;
  const game = games.find((game) => game.name === sections[headingLabels.game]);

  if (!game) {
    new_game = {
      url: sections[headingLabels.gameUrl] || '',
      name: sections[headingLabels.game],
      logo: '',
      native: false,
      status: extractStatus(sections[headingLabels.antiCheatStatus]),
      reference: sections[headingLabels.antiCheatProof] || '',
      anticheats: getAntiCheats(sections),
      notes: getNotes(sections) || [],
      updates: [],
      storeIds: getStoreId(sections),
      slug: slugify(sections[headingLabels.game]),
      dateChanged: String(new Date().toISOString()),
    };
  } else {
    const date = String(new Date().toISOString());
    const notes = getNotes(sections);

    new_game = {
      ...game,
      storeIds: getStoreId(sections, game.storeIds),
      notes: notes ? [...game.notes, ...notes] : game.notes,
      status: extractStatus(sections[headingLabels.antiCheatStatus]),
      updates: [
        ...game.updates,
        {
          name: sections[headingLabels.updateTitle] || '',
          reference: sections[headingLabels.antiCheatProof] || null,
          date,
        },
      ],
      dateChanged: date,
    };
  }

  // console.dir(new_game, { depth: null });
  await fs.writeFile(`${targetDirPath}${issueId}.json`, JSON.stringify(new_game, null, 2), { encoding: 'utf8' });
  console.log(`INFO: Successfully CREATED ${targetDirPath}${issueId}.json`);
}

(async () => {
  const db = await fs.readFile('./games.json', 'utf8');
  const games: Game[] = JSON.parse(db);

  try {
    const files = await fs.readdir(issuesDir);
    if (files.length === 0) throw Error('', { cause: 'NOFILE' });
    files.forEach(async (file) => await processMd(games, `${issuesDir}${file}`));
  } catch (err) {
    if (err instanceof Error) {
      if ('code' in err && err.code === 'ENOENT') {
        console.error(`ERR: ${issuesDir} directory does not exist.`);
      }
      if (err.cause === 'NOFILE') {
        console.error(`ERR: no issues in ${issuesDir}`);
      }
    }
  }
})();
