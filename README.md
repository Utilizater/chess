# Chess Opening Trainer

A free, self-hosted, Anki-style drill for chess opening repertoires. Play out
prepared lines on a real board; get told immediately if you've left book.
Ships with a 42-line Blackmar-Diemer Gambit course.

Built with Next.js, TypeScript, Tailwind, chess.js, react-chessboard, and
MongoDB.

## Quick start

```bash
npm install
echo "MONGO_DB_URI=<your-connection-string>" > .env
npm run seed:courses
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Docs

- [docs/BUSINESS.md](./docs/BUSINESS.md) — what this is, who it's for, product vision
- [docs/TECHNICAL.md](./docs/TECHNICAL.md) — architecture, data model, setup details, admin tooling
